// Exact size PDF for a sheet of labels.
//
// The page is US Letter, 612 by 792 points. Every label cell sits at its true
// position from the template, with the grower's remembered offsets applied
// inside the PDF itself. The document asks the print dialog not to scale
// (PrintScaling None) so nothing downstream shrinks it.
//
// Pure TypeScript on pdf-lib. No native code, so the same builder runs in the
// app and in the tests.

import { PDFDocument, PDFFont, PDFName, StandardFonts, rgb } from "pdf-lib";
import { chunkIntoSheets, sizeClassForLine } from "../core/labels";
import {
  LINE1_FONT_PT,
  LINE2_FONT_PT,
  LINE_GAP_IN,
  LINE_HEIGHT_RATIO,
  MARK_GAP_IN,
  MIN_FONT_PT,
  PAGE,
  inToPt,
  isPrintable,
  slotRect,
  type ContentBox,
  type Offsets,
  type SheetLayout,
  type TemplateDef,
} from "../core/templates";

export interface LabelContent {
  line1: string;
  line2: string;
  mark?: string; // cutting entries, for example "C08"
}

export interface LabelWarning {
  sheet: number; // 1 based
  slot: number; // 1 based
  kind: "too_long" | "characters";
  message: string;
}

export interface BuiltPdf {
  bytes: Uint8Array;
  sheets: number;
  warnings: LabelWarning[];
}

export class NotPrintableError extends Error {
  constructor(public templateName: string) {
    super(`${templateName} cannot print yet. Its sheet grid has not been entered.`);
    this.name = "NotPrintableError";
  }
}

export const PAGE_WIDTH_PT = inToPt(PAGE.widthIn);
export const PAGE_HEIGHT_PT = inToPt(PAGE.heightIn);

// Font metrics for Helvetica, not calibration numbers. Cap height sits at
// about 0.72 of the font size, so a baseline falls a little under 0.83 of the
// size below the top of a line box with the lifted 1.15 line height.
const BASELINE_RATIO = 0.83;

const INK_LINE1 = rgb(0, 0, 0);
const INK_LINE2 = rgb(0.2, 0.2, 0.2);
const INK_GUIDE = rgb(0.55, 0.55, 0.55);

interface Fonts {
  bold: PDFFont;
  italic: PDFFont;
  mono: PDFFont;
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    mono: await doc.embedFont(StandardFonts.CourierBold),
  };
}

/** Standard fonts hold a fixed set of characters. Swap the rest for a question mark and say so. */
function encodable(font: PDFFont, text: string): { text: string; replaced: boolean } {
  const set = new Set(font.getCharacterSet());
  let replaced = false;
  const out = Array.from(text.normalize("NFC"))
    .map((ch) => {
      if (set.has(ch.codePointAt(0) as number)) return ch;
      replaced = true;
      return "?";
    })
    .join("");
  return { text: out, replaced };
}

function fit(font: PDFFont, text: string, startPt: number, availPt: number): { size: number; overflow: boolean } {
  if (!text) return { size: startPt, overflow: false };
  const width = font.widthOfTextAtSize(text, startPt);
  if (width <= availPt) return { size: startPt, overflow: false };
  const shrunk = Math.floor(((startPt * availPt) / width) * 100) / 100;
  if (shrunk >= MIN_FONT_PT) return { size: shrunk, overflow: false };
  return { size: MIN_FONT_PT, overflow: true };
}

export interface DrawOp {
  text: string;
  x: number; // points from the left edge of the page
  baseline: number; // points from the top edge of the page
  size: number;
  font: "bold" | "italic" | "mono";
}

export interface CellLayout {
  ops: DrawOp[];
  warnings: Omit<LabelWarning, "sheet" | "slot">[];
}

/** Where one label's text goes inside the cell, with offsets applied. */
export function layoutLabel(
  fonts: Fonts,
  layout: SheetLayout,
  content: ContentBox,
  offsets: Offsets,
  slot: number,
  label: LabelContent
): CellLayout {
  const cell = slotRect(layout, slot);

  // The safe zone shrinks about the cell center by the content scale. The
  // scale also applies to the type, as the Commerce Center's CSS did.
  const effW = content.widthIn * content.scale;
  const effH = content.heightIn * content.scale;
  const padX = content.paddingXIn * content.scale;
  const boxLeft = cell.xIn + (cell.widthIn - effW) / 2 + offsets.xIn;
  const boxTop = cell.yIn + (cell.heightIn - effH) / 2 + offsets.yIn;

  const l1 = encodable(fonts.bold, label.line1);
  const l2 = encodable(fonts.italic, label.line2);
  const mk = encodable(fonts.mono, label.mark ?? "");
  const warnings: CellLayout["warnings"] = [];
  if (l1.replaced || l2.replaced || mk.replaced) {
    warnings.push({ kind: "characters", message: "A character on this label is not available on the printed label. It prints as a question mark." });
  }

  const availPt = inToPt(effW - 2 * padX);
  const start1 = LINE1_FONT_PT[sizeClassForLine(label.line1)] * content.scale;
  const start2 = LINE2_FONT_PT * content.scale;

  const f1 = fit(fonts.bold, l1.text, start1, availPt);
  const markW = mk.text ? fonts.mono.widthOfTextAtSize(mk.text, start2) : 0;
  const avail2 = availPt - (mk.text ? markW + inToPt(MARK_GAP_IN) : 0);
  const f2 = fit(fonts.italic, l2.text, start2, avail2);
  if (f1.overflow || f2.overflow) {
    warnings.push({ kind: "too_long", message: "This name is too long for the label. Shorten it or it will run past the edge." });
  }

  const hasRow2 = !!(l2.text || mk.text);
  const row1H = f1.size * LINE_HEIGHT_RATIO;
  const row2H = hasRow2 ? f2.size * LINE_HEIGHT_RATIO : 0;
  const gapPt = hasRow2 ? inToPt(LINE_GAP_IN * content.scale) : 0;
  const blockH = row1H + gapPt + row2H;

  const blockTopPt = inToPt(boxTop) + (inToPt(effH) - blockH) / 2;
  const leftPt = inToPt(boxLeft + padX);
  const ops: DrawOp[] = [];

  if (l1.text) {
    ops.push({ text: l1.text, x: leftPt, baseline: blockTopPt + f1.size * BASELINE_RATIO, size: f1.size, font: "bold" });
  }
  const row2Top = blockTopPt + row1H + gapPt;
  if (l2.text) {
    ops.push({ text: l2.text, x: leftPt, baseline: row2Top + f2.size * BASELINE_RATIO, size: f2.size, font: "italic" });
  }
  if (mk.text) {
    const rightPt = inToPt(boxLeft + effW - padX);
    ops.push({
      text: mk.text,
      x: rightPt - fonts.mono.widthOfTextAtSize(mk.text, f2.size),
      baseline: row2Top + f2.size * BASELINE_RATIO,
      size: f2.size,
      font: "mono",
    });
  }
  return { ops, warnings };
}

function newDoc(title: string): Promise<PDFDocument> {
  return PDFDocument.create().then((doc) => {
    doc.setTitle(title);
    doc.setProducer("LabelLeaf");
    doc.setCreator("LabelLeaf");
    // Ask the print dialog to print at 100 percent.
    doc.catalog.set(PDFName.of("ViewerPreferences"), doc.context.obj({ PrintScaling: PDFName.of("None") }));
    return doc;
  });
}

function requirePrintable(template: TemplateDef): { layout: SheetLayout; content: ContentBox } {
  if (!isPrintable(template) || !template.layout || !template.content) throw new NotPrintableError(template.name);
  return { layout: template.layout, content: template.content };
}

export interface BuildOptions {
  template: TemplateDef;
  offsets: Offsets;
  items: LabelContent[];
  startSlot: number;
}

/** Builds the PDF for a run of labels. One page per sheet. */
export async function buildLabelPdf(opts: BuildOptions): Promise<BuiltPdf> {
  const { layout, content } = requirePrintable(opts.template);
  const perSheet = layout.columns * layout.rows;
  const doc = await newDoc("LabelLeaf labels");
  const fonts = await loadFonts(doc);
  const sheets = chunkIntoSheets(opts.items, Math.max(1, Math.min(perSheet, Math.floor(opts.startSlot) || 1)), perSheet);
  const warnings: LabelWarning[] = [];

  // An empty run still gives one blank page, so the print dialog has something to show.
  if (sheets.length === 0) doc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  sheets.forEach((sheet, sheetIndex) => {
    const page = doc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    sheet.items.forEach((label, i) => {
      const slot = sheet.blanks + i + 1;
      const cell = layoutLabel(fonts, layout, content, opts.offsets, slot, label);
      cell.warnings.forEach((w) => warnings.push({ ...w, sheet: sheetIndex + 1, slot }));
      for (const op of cell.ops) {
        page.drawText(op.text, {
          x: op.x,
          y: PAGE_HEIGHT_PT - op.baseline,
          size: op.size,
          font: fonts[op.font],
          color: op.font === "italic" ? INK_LINE2 : INK_LINE1,
        });
      }
    });
  });

  return { bytes: await doc.save(), sheets: Math.max(1, sheets.length), warnings };
}

/** Checks a run without keeping the PDF, so the queue can show warnings as the grower types. */
export async function preflightLabels(opts: BuildOptions): Promise<LabelWarning[]> {
  return (await buildLabelPdf(opts)).warnings;
}

/**
 * The calibration test sheet. Prints, for every slot, the true cell outline
 * with no offset (where the grid says the sticker edge is), plus the content
 * box and a center cross with the current offsets applied. The grower reads
 * how far the cross sits from the middle of the real sticker and nudges.
 */
export async function buildCalibrationPdf(opts: { template: TemplateDef; offsets: Offsets; heading: string }): Promise<BuiltPdf> {
  const { layout, content } = requirePrintable(opts.template);
  const doc = await newDoc("LabelLeaf test sheet");
  const fonts = await loadFonts(doc);
  const page = doc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
  const perSheet = layout.columns * layout.rows;
  const effW = content.widthIn * content.scale;
  const effH = content.heightIn * content.scale;
  const arm = 5; // half length of the cross, in points

  for (let slot = 1; slot <= perSheet; slot++) {
    const cell = slotRect(layout, slot);
    const cx = inToPt(cell.xIn + cell.widthIn / 2 + opts.offsets.xIn);
    const cy = PAGE_HEIGHT_PT - inToPt(cell.yIn + cell.heightIn / 2 + opts.offsets.yIn);

    page.drawRectangle({
      x: inToPt(cell.xIn),
      y: PAGE_HEIGHT_PT - inToPt(cell.yIn + cell.heightIn),
      width: inToPt(cell.widthIn),
      height: inToPt(cell.heightIn),
      borderColor: INK_GUIDE,
      borderWidth: 0.4,
    });
    page.drawRectangle({
      x: cx - inToPt(effW) / 2,
      y: cy - inToPt(effH) / 2,
      width: inToPt(effW),
      height: inToPt(effH),
      borderColor: INK_LINE1,
      borderWidth: 0.4,
    });
    page.drawLine({ start: { x: cx - arm, y: cy }, end: { x: cx + arm, y: cy }, thickness: 0.6, color: INK_LINE1 });
    page.drawLine({ start: { x: cx, y: cy - arm }, end: { x: cx, y: cy + arm }, thickness: 0.6, color: INK_LINE1 });
    page.drawText(String(slot), {
      x: inToPt(cell.xIn) + 3,
      y: PAGE_HEIGHT_PT - inToPt(cell.yIn) - 7,
      size: 5,
      font: fonts.mono,
      color: INK_GUIDE,
    });
  }

  if (layout.marginTopIn >= 0.35) {
    page.drawText(opts.heading, { x: inToPt(layout.marginLeftIn), y: PAGE_HEIGHT_PT - inToPt(0.25), size: 7, font: fonts.bold, color: INK_LINE1 });
  }

  return { bytes: await doc.save(), sheets: 1, warnings: [] };
}
