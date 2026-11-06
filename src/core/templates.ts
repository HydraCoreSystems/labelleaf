// Label sheet templates and calibration. THE ONLY FILE THAT HOLDS THESE NUMBERS.
//
// The Commerce Center kept the same offsets in three places at once (a TS
// constants file, a print button stylesheet, and the global stylesheet). Here
// every geometry, offset, scale, and font size lives in this file and nowhere
// else. A guard test (templates.test.ts) fails the build if a measured number
// shows up in any other source file. Everything else reads from here.
//
// Units: inches for geometry, points for type. Positive x offsets move content
// right. Positive y offsets move content down. All y values count from the top
// edge of the page.

import type { LineSizeClass } from "./labels";

export const PAGE = { widthIn: 8.5, heightIn: 11 } as const;
export const POINTS_PER_INCH = 72;

export type TemplateId = "avery8257" | "avery5160";

export interface SheetLayout {
  columns: number;
  rows: number;
  labelWidthIn: number;
  labelHeightIn: number;
  pitchXIn: number; // left edge of one column to left edge of the next
  pitchYIn: number; // top edge of one row to top edge of the next
  marginTopIn: number;
  marginLeftIn: number;
}

/** The safe zone for ink inside one label cell. */
export interface ContentBox {
  widthIn: number;
  heightIn: number;
  paddingXIn: number;
  paddingYIn: number;
  scale: number; // fits content inside the safe zone, below 1
}

export interface Offsets {
  xIn: number;
  yIn: number;
}

export interface TemplateDef {
  id: TemplateId;
  name: string;
  stock: string;
  labelsPerSheet: number;
  /** null means the sheet grid is not entered yet, so the template cannot print. */
  layout: SheetLayout | null;
  content: ContentBox | null;
  /** Starting offsets before a grower calibrates. */
  defaultOffsets: Offsets;
  /** Where the numbers came from, for the next person who reads this file. */
  provenance: string;
}

/**
 * Avery 5160, lifted from gm-commerce lib/nursery/avery-calibration.ts.
 *
 * Sheet geometry is the published Avery 5160 layout: US Letter, 3 columns by
 * 10 rows, label 2.625in by 1in, horizontal pitch 2.75in (0.125in column gap),
 * vertical pitch 1in (no row gap), margins top and bottom 0.5in, left and right
 * 0.1875in.
 *
 * Offsets and scale are measured, not published. Both were read off physical
 * prints on Phil's printer:
 * - yIn +0.07 (about 5pt, 1.8mm): text printed about 0.10in too high because
 *   of the printer's feed lead edge offset, so content moves down.
 * - xIn +0.03 (about 2pt, 0.8mm): text touched the left die cut edge, so
 *   content moves right.
 * - scale 0.96: keeps content inside the die cut safe zone.
 * - safe zone 2.30in by 0.68in, which leaves 0.1625in left and right and 0.16in
 *   top and bottom.
 * The Commerce Center held a QR code in this safe zone. LabelLeaf has none, so
 * its text uses more of the width, and the zone itself stays as measured.
 */
const AVERY_5160: TemplateDef = {
  id: "avery5160",
  name: "Avery 5160",
  stock: "Address labels, 1 inch by 2.625 inches, 30 per US Letter sheet",
  labelsPerSheet: 30,
  layout: {
    columns: 3,
    rows: 10,
    labelWidthIn: 2.625,
    labelHeightIn: 1,
    pitchXIn: 2.75,
    pitchYIn: 1,
    marginTopIn: 0.5,
    marginLeftIn: 0.1875,
  },
  content: {
    widthIn: 2.3,
    heightIn: 0.68,
    paddingXIn: 0.04,
    paddingYIn: 0.02,
    scale: 0.96,
  },
  defaultOffsets: { xIn: 0.03, yIn: 0.07 },
  provenance: "Lifted from the Commerce Center. Offsets measured from physical prints.",
};

/**
 * Avery 8257, the lead template.
 *
 * Published facts, from Avery: label 0.75in tall by 2.25in wide, 30 labels per
 * US Letter sheet, same template as Avery 6870.
 *
 * NOT YET ENTERED: the column and row count, the margins, and the pitches.
 * Avery's public pages do not list them. They come from the blank 6870
 * template PDF. Until they are entered here, the template reports itself as
 * not printable and the app says so. Do not guess these numbers. A wrong grid
 * prints labels off the stickers.
 *
 * The Commerce Center offsets do not carry over. They were measured for the
 * taller 5160 label. Offsets start at zero and the grower tunes them on the
 * calibration screen. A fresh measurement on Phil's own printer is a later
 * phase and nothing here waits on it.
 */
const AVERY_8257: TemplateDef = {
  id: "avery8257",
  name: "Avery 8257",
  stock: "Address labels, 0.75 inch by 2.25 inches, inkjet, 30 per US Letter sheet",
  labelsPerSheet: 30,
  layout: null,
  content: null,
  defaultOffsets: { xIn: 0, yIn: 0 },
  provenance: "Label size and count from Avery. Grid and margins pending the blank 6870 template.",
};

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  avery8257: AVERY_8257,
  avery5160: AVERY_5160,
};

/** Lead template first, per the brief. */
export const TEMPLATE_ORDER: TemplateId[] = ["avery8257", "avery5160"];

export const DEFAULT_TEMPLATE: TemplateId = "avery8257";

export function isPrintable(t: TemplateDef): boolean {
  return t.layout !== null && t.content !== null;
}

/**
 * The template a fresh install starts on: the lead template when it can
 * print, otherwise the next one that can. When the 8257 grid is entered this
 * moves to 8257 on its own.
 */
export function firstPrintableTemplate(): TemplateId {
  return TEMPLATE_ORDER.find((id) => isPrintable(TEMPLATES[id])) ?? DEFAULT_TEMPLATE;
}

/** The grower's remembered offsets if any, otherwise the template defaults. */
export function resolveOffsets(t: TemplateDef, stored?: Offsets | null): Offsets {
  if (stored && Number.isFinite(stored.xIn) && Number.isFinite(stored.yIn)) {
    return { xIn: stored.xIn, yIn: stored.yIn };
  }
  return { ...t.defaultOffsets };
}

/** Largest nudge the calibration screen accepts, either direction, per axis. */
export const MAX_OFFSET_IN = 0.25;
/** Step for one tap on a nudge button. */
export const OFFSET_STEP_IN = 0.01;

export function clampOffset(valueIn: number): number {
  if (!Number.isFinite(valueIn)) return 0;
  const clamped = Math.max(-MAX_OFFSET_IN, Math.min(MAX_OFFSET_IN, valueIn));
  return Math.round(clamped * 1000) / 1000;
}

export interface SlotRect {
  slot: number; // 1 based
  row: number; // 1 based
  col: number; // 1 based
  xIn: number; // left edge of the cell
  yIn: number; // top edge of the cell, from the top of the page
  widthIn: number;
  heightIn: number;
}

/** Slots fill left to right, then down, as the Commerce Center did. */
export function slotRect(layout: SheetLayout, slot: number): SlotRect {
  const row = Math.ceil(slot / layout.columns);
  const col = ((slot - 1) % layout.columns) + 1;
  return {
    slot,
    row,
    col,
    xIn: layout.marginLeftIn + (col - 1) * layout.pitchXIn,
    yIn: layout.marginTopIn + (row - 1) * layout.pitchYIn,
    widthIn: layout.labelWidthIn,
    heightIn: layout.labelHeightIn,
  };
}

// Type sizes, in points. Lifted from the Commerce Center label page, where the
// tiers were tuned against real sticker widths so long hoya names fit one line.
// The cutoffs by character count live in labels.ts (sizeClassForLine).

/** Line one (genus and species). Bold. */
export const LINE1_FONT_PT: Record<LineSizeClass, number> = {
  lg: 7.5,
  md: 7.5,
  sm: 7.2,
  xs: 7,
};

/** Line two (cultivar, form, or descriptor). Italic. */
export const LINE2_FONT_PT = 6.5;

/** Gap between the two lines, in inches. Lifted from the Commerce Center. */
export const LINE_GAP_IN = 0.015;

/** Line height as a multiple of font size. Lifted from the Commerce Center. */
export const LINE_HEIGHT_RATIO = 1.15;

/**
 * Floor for shrink to fit. Below this a line is flagged as too long for the
 * label instead of printed too small to read. New in LabelLeaf.
 */
export const MIN_FONT_PT = 5;

export function inToPt(inches: number): number {
  return inches * POINTS_PER_INCH;
}

/** Space kept between line two and the cutting mark on the same row. New in LabelLeaf. */
export const MARK_GAP_IN = 0.06;
