import { describe, it, expect } from "vitest";
import { PDFDict, PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildCalibrationPdf, buildLabelPdf, NotPrintableError, type LabelContent } from "./sheet";
import { TEMPLATES, type TemplateDef } from "../core/templates";

// PDF PROOF. The PDF is read back with pdf.js, a separate parser, and checked
// against the published Avery 5160 sheet numbers written out here by hand.
// The expected positions do not come from the builder's own helper functions.

const T5160 = TEMPLATES.avery5160;
const PT = 72;

// Published Avery 5160 layout, in inches.
const SHEET = { marginLeft: 0.1875, marginTop: 0.5, pitchX: 2.75, pitchY: 1, cellW: 2.625, cellH: 1, columns: 3 };
// Measured content box and scale from the Commerce Center.
const BOX = { w: 2.3, h: 0.68, padX: 0.04, scale: 0.96 };

function cellOf(slot: number) {
  const col = (slot - 1) % SHEET.columns;
  const row = Math.floor((slot - 1) / SHEET.columns);
  return { left: SHEET.marginLeft + col * SHEET.pitchX, top: SHEET.marginTop + row * SHEET.pitchY };
}

/** Expected left edge of text in a cell, in points from the page's left edge. */
function expectedTextX(slot: number, offX: number) {
  const { left } = cellOf(slot);
  const effW = BOX.w * BOX.scale;
  const boxLeft = left + (SHEET.cellW - effW) / 2 + offX;
  return (boxLeft + BOX.padX * BOX.scale) * PT;
}

interface Item {
  str: string;
  x: number; // points from the left edge
  yUp: number; // points from the bottom edge, as PDF stores it
  size: number;
}

async function readPages(bytes: Uint8Array): Promise<{ pages: Item[][]; sizes: { w: number; h: number }[] }> {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages: Item[][] = [];
  const sizes: { w: number; h: number }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    sizes.push({ w: vp.width, h: vp.height });
    const tc = await page.getTextContent();
    pages.push(
      tc.items
        .filter((i: any) => typeof i.str === "string" && i.str.trim() !== "")
        .map((i: any) => ({ str: i.str, x: i.transform[4], yUp: i.transform[5], size: Math.abs(i.transform[0]) }))
    );
  }
  return { pages, sizes };
}

function oneLine(n: number): LabelContent[] {
  return Array.from({ length: n }, (_, i) => ({ line1: `Slot ${String(i + 1).padStart(2, "0")}`, line2: "" }));
}

describe("page and print settings", () => {
  it("measures US Letter at exact size", async () => {
    const out = await buildLabelPdf({ template: T5160, offsets: T5160.defaultOffsets, items: oneLine(3), startSlot: 1 });
    const { sizes } = await readPages(out.bytes);
    expect(sizes).toHaveLength(1);
    expect(sizes[0].w).toBeCloseTo(612, 6);
    expect(sizes[0].h).toBeCloseTo(792, 6);

    const reread = await PDFDocument.load(out.bytes);
    const box = reread.getPage(0).getMediaBox();
    expect([box.x, box.y, box.width, box.height]).toEqual([0, 0, 612, 792]);
  });

  it("asks the print dialog not to scale", async () => {
    const out = await buildLabelPdf({ template: T5160, offsets: T5160.defaultOffsets, items: oneLine(1), startSlot: 1 });
    const reread = await PDFDocument.load(out.bytes);
    const prefs = reread.catalog.lookup(PDFName.of("ViewerPreferences"), PDFDict);
    expect(prefs.get(PDFName.of("PrintScaling"))?.toString()).toBe("/None");
  });
});

describe("every label cell sits at its true position with offsets applied", () => {
  const OFF = { xIn: 0.03, yIn: 0.07 }; // the lifted measured defaults

  it("places all 30 labels from the published 5160 grid", async () => {
    const out = await buildLabelPdf({ template: T5160, offsets: OFF, items: oneLine(30), startSlot: 1 });
    const { pages } = await readPages(out.bytes);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(30);

    for (let slot = 1; slot <= 30; slot++) {
      const item = pages[0].find((i) => i.str === `Slot ${String(slot).padStart(2, "0")}`);
      expect(item, `slot ${slot} text found`).toBeDefined();
      const { top } = cellOf(slot);

      // Horizontal: exact to a hundredth of a point.
      expect(item!.x).toBeCloseTo(expectedTextX(slot, OFF.xIn), 2);

      // Vertical: the baseline sits inside this cell, and inside the content
      // box once the downward offset is applied.
      const baselineFromTop = 792 - item!.yUp;
      const effH = BOX.h * BOX.scale;
      const boxTop = (top + (SHEET.cellH - effH) / 2 + OFF.yIn) * PT;
      expect(baselineFromTop).toBeGreaterThan(boxTop);
      expect(baselineFromTop).toBeLessThan(boxTop + effH * PT);
      expect(baselineFromTop).toBeGreaterThan(top * PT);
      expect(baselineFromTop).toBeLessThan((top + SHEET.cellH) * PT);
    }
  });

  it("moves every label by exactly the offset the grower sets", async () => {
    const base = await readPages((await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: oneLine(30), startSlot: 1 })).bytes);
    const moved = await readPages((await buildLabelPdf({ template: T5160, offsets: { xIn: 0.05, yIn: -0.03 }, items: oneLine(30), startSlot: 1 })).bytes);
    for (const a of base.pages[0]) {
      const b = moved.pages[0].find((i) => i.str === a.str)!;
      expect(b.x - a.x).toBeCloseTo(0.05 * PT, 3); // right
      expect(b.yUp - a.yUp).toBeCloseTo(0.03 * PT, 3); // up, because the y offset went negative
    }
  });

  it("uses remembered offsets that differ from the defaults", async () => {
    const out = await readPages((await buildLabelPdf({ template: T5160, offsets: { xIn: -0.02, yIn: 0.11 }, items: oneLine(1), startSlot: 1 })).bytes);
    expect(out.pages[0][0].x).toBeCloseTo(expectedTextX(1, -0.02), 2);
  });
});

describe("start slot and sheets", () => {
  it("leaves earlier slots blank and starts at the chosen slot", async () => {
    const out = await readPages((await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: oneLine(3), startSlot: 14 })).bytes);
    expect(out.pages[0]).toHaveLength(3);
    const byText = (s: string) => out.pages[0].find((i) => i.str === s)!;
    expect(byText("Slot 01").x).toBeCloseTo(expectedTextX(14, 0), 2);
    expect(byText("Slot 02").x).toBeCloseTo(expectedTextX(15, 0), 2);
    expect(byText("Slot 03").x).toBeCloseTo(expectedTextX(16, 0), 2);
    // Row of slot 14 is row 5, so it must sit lower than anything in row 1.
    expect(792 - byText("Slot 01").yUp).toBeGreaterThan(4 * PT);
  });

  it("prints a single label at one chosen slot", async () => {
    const out = await readPages((await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: oneLine(1), startSlot: 30 })).bytes);
    expect(out.pages[0]).toHaveLength(1);
    expect(out.pages[0][0].x).toBeCloseTo(expectedTextX(30, 0), 2);
  });

  it("spills onto a second page that starts at slot 1", async () => {
    const built = await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: oneLine(32), startSlot: 1 });
    expect(built.sheets).toBe(2);
    const { pages, sizes } = await readPages(built.bytes);
    expect(pages).toHaveLength(2);
    expect(sizes.every((s) => Math.round(s.w) === 612 && Math.round(s.h) === 792)).toBe(true);
    expect(pages[1].map((i) => i.str).sort()).toEqual(["Slot 31", "Slot 32"]);
    expect(pages[1].find((i) => i.str === "Slot 31")!.x).toBeCloseTo(expectedTextX(1, 0), 2);
  });
});

describe("two lines and a cutting mark", () => {
  it("prints line one, line two, and the mark on line two's row, right aligned", async () => {
    const label: LabelContent = { line1: "Hoya burmanica", line2: "'Silver'", mark: "C08" };
    const out = await readPages((await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: [label], startSlot: 1 })).bytes);
    const items = out.pages[0];
    expect(items.map((i) => i.str).sort()).toEqual(["'Silver'", "C08", "Hoya burmanica"].sort());

    const l1 = items.find((i) => i.str === "Hoya burmanica")!;
    const l2 = items.find((i) => i.str === "'Silver'")!;
    const mk = items.find((i) => i.str === "C08")!;

    // Line two and the mark share a row. Line one sits above both.
    expect(mk.yUp).toBeCloseTo(l2.yUp, 3);
    expect(l1.yUp).toBeGreaterThan(l2.yUp);
    // Line one and line two share a left edge.
    expect(l1.x).toBeCloseTo(l2.x, 3);

    // The mark's right edge lands on the right edge of the content box.
    const pdf = await PDFDocument.create();
    const mono = await pdf.embedFont(StandardFonts.CourierBold);
    const markW = mono.widthOfTextAtSize("C08", mk.size);
    const effW = BOX.w * BOX.scale;
    const boxRight = (SHEET.marginLeft + (SHEET.cellW - effW) / 2 + effW - BOX.padX * BOX.scale) * PT;
    expect(mk.x + markW).toBeCloseTo(boxRight, 2);
  });

  it("adds no third line", async () => {
    const out = await readPages((await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: [{ line1: "Hoya carnosa", line2: "'Krimson Queen'", mark: "C01" }], startSlot: 1 })).bytes);
    const rows = new Set(out.pages[0].map((i) => Math.round(i.yUp * 100)));
    expect(rows.size).toBe(2);
  });
});

describe("long names under the tier rules", () => {
  async function fitCheck(label: LabelContent) {
    const built = await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: [label], startSlot: 1 });
    const { pages } = await readPages(built.bytes);
    const item = pages[0].find((i) => i.str === label.line1)!;
    const pdf = await PDFDocument.create();
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const effW = BOX.w * BOX.scale;
    const right = (SHEET.marginLeft + (SHEET.cellW - effW) / 2 + effW - BOX.padX * BOX.scale) * PT;
    return { built, item, endsAt: item.x + bold.widthOfTextAtSize(label.line1, item.size), right };
  }

  it("keeps a long hoya name on one line inside the content box", async () => {
    const r = await fitCheck({ line1: "Hoya archboldiana × pubicalyx cf.", line2: "" });
    expect(r.endsAt).toBeLessThanOrEqual(r.right + 0.01);
    expect(r.built.warnings).toEqual([]);
  });

  it("starts from the tier size, smaller for longer names", async () => {
    const short = await fitCheck({ line1: "Hoya", line2: "" });
    const medium = await fitCheck({ line1: "Hoya pubicalyx 'Silver Pink'", line2: "" });
    expect(short.item.size).toBeGreaterThanOrEqual(medium.item.size);
    expect(short.item.size).toBeCloseTo(7.5 * 0.96, 2); // lg tier at the content scale
  });

  it("warns, and does not hide it, when a name is too long even at the smallest size", async () => {
    const long = "Hoya " + "megalocephalus".repeat(6);
    const r = await fitCheck({ line1: long, line2: "" });
    expect(r.built.warnings.map((w) => w.kind)).toContain("too_long");
    expect(r.built.warnings[0]).toMatchObject({ sheet: 1, slot: 1 });
  });

  it("prints the multiplication sign, which the font can show", async () => {
    const built = await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: [{ line1: "Hoya × carnosa", line2: "" }], startSlot: 1 });
    expect(built.warnings).toEqual([]);
    const { pages } = await readPages(built.bytes);
    expect(pages[0][0].str).toBe("Hoya × carnosa");
  });

  it("warns when a character cannot be printed", async () => {
    const built = await buildLabelPdf({ template: T5160, offsets: { xIn: 0, yIn: 0 }, items: [{ line1: "Hoya Ωmega", line2: "" }], startSlot: 1 });
    expect(built.warnings.map((w) => w.kind)).toContain("characters");
  });
});

describe("templates that cannot print", () => {
  // A template with no grid entered must refuse, whatever its name. Avery 8257
  // now has its grid, so this uses a fixture with the grid left out.
  const NO_GRID: TemplateDef = { ...TEMPLATES.avery5160, layout: null, content: null };

  it("refuses to build labels", async () => {
    await expect(buildLabelPdf({ template: NO_GRID, offsets: NO_GRID.defaultOffsets, items: oneLine(1), startSlot: 1 })).rejects.toBeInstanceOf(NotPrintableError);
  });
});

describe("Avery 8257 prints on its published grid", () => {
  const T8257 = TEMPLATES.avery8257;
  const ZERO = { xIn: 0, yIn: 0 };

  it("sets slot 1 and slot 30 labels inside their cells, on one Letter page", async () => {
    const c = T8257.content!;
    const l = T8257.layout!;
    const items = Array.from({ length: 30 }, (_, i) => ({ line1: `Hoya sp${i}`, line2: "" }));
    const built = await buildLabelPdf({ template: T8257, offsets: ZERO, items, startSlot: 1 });
    const { pages, sizes } = await readPages(built.bytes);
    expect(Math.round(sizes[0].w)).toBe(612);
    expect(Math.round(sizes[0].h)).toBe(792);
    expect(pages[0]).toHaveLength(30);
    // Slot 1: left edge is margin + (cell - box) / 2 + padding.
    const first = pages[0].find((i) => i.str === "Hoya sp0")!;
    expect(first.x).toBeCloseTo((0.375 + (l.labelWidthIn - c.widthIn) / 2 + c.paddingXIn) * PT, 2);
    // Slot 30 sits in row 10, column 3: left edge from the published pitch.
    const last = pages[0].find((i) => i.str === "Hoya sp29")!;
    expect(last.x).toBeCloseTo((0.375 + 2 * 2.75 + (l.labelWidthIn - c.widthIn) / 2 + c.paddingXIn) * PT, 2);
    // Its text sits within the cell: below the cell top, above the cell bottom.
    const cellTop = 792 - (0.625 + 9 * 1) * PT;
    expect(last.yUp).toBeLessThan(cellTop);
    expect(last.yUp).toBeGreaterThan(cellTop - 0.75 * PT);
  });

  it("applies a remembered offset on the 8257", async () => {
    const base = await readPages((await buildLabelPdf({ template: T8257, offsets: ZERO, items: oneLine(1), startSlot: 1 })).bytes);
    const moved = await readPages((await buildLabelPdf({ template: T8257, offsets: { xIn: 0.05, yIn: 0.1 }, items: oneLine(1), startSlot: 1 })).bytes);
    expect(moved.pages[0][0].x - base.pages[0][0].x).toBeCloseTo(0.05 * PT, 2);
    expect(base.pages[0][0].yUp - moved.pages[0][0].yUp).toBeCloseTo(0.1 * PT, 2);
  });
});

describe("a template with another grid works the same way", () => {
  // FIXTURE ONLY. Invented numbers that prove the builder follows whatever
  // geometry a template carries. These are NOT Avery 8257 numbers.
  const FIXTURE: TemplateDef = {
    id: "avery8257",
    name: "Fixture",
    stock: "fixture",
    labelsPerSheet: 30,
    layout: { columns: 3, rows: 10, labelWidthIn: 2.25, labelHeightIn: 0.75, pitchXIn: 2.5, pitchYIn: 1, marginTopIn: 0.5, marginLeftIn: 0.5 },
    content: { widthIn: 2, heightIn: 0.5, paddingXIn: 0.05, paddingYIn: 0.02, scale: 1 },
    defaultOffsets: { xIn: 0, yIn: 0 },
    provenance: "fixture",
  };

  it("places a label from the fixture grid", async () => {
    const out = await readPages((await buildLabelPdf({ template: FIXTURE, offsets: { xIn: 0, yIn: 0 }, items: oneLine(1), startSlot: 5 })).bytes);
    // Slot 5 is column 2, row 2. Left edge: 0.5 + 2.5 = 3.0. Box inset (2.25 - 2) / 2 = 0.125. Pad 0.05.
    expect(out.pages[0][0].x).toBeCloseTo((3.0 + 0.125 + 0.05) * PT, 2);
  });
});

describe("calibration test sheet", () => {
  it("is one US Letter page with all 30 slot numbers and a heading", async () => {
    const built = await buildCalibrationPdf({ template: T5160, offsets: T5160.defaultOffsets, heading: "LabelLeaf test sheet" });
    const { pages, sizes } = await readPages(built.bytes);
    expect(built.sheets).toBe(1);
    expect(Math.round(sizes[0].w)).toBe(612);
    expect(Math.round(sizes[0].h)).toBe(792);
    for (let slot = 1; slot <= 30; slot++) {
      const mark = pages[0].find((i) => i.str === String(slot));
      expect(mark, `slot ${slot} number`).toBeDefined();
      expect(mark!.x).toBeCloseTo(cellOf(slot).left * PT + 3, 2);
    }
    expect(pages[0].some((i) => i.str === "LabelLeaf test sheet")).toBe(true);
  });

  it("refuses a template that cannot print", async () => {
    const t: TemplateDef = { ...TEMPLATES.avery5160, layout: null, content: null };
    await expect(buildCalibrationPdf({ template: t, offsets: t.defaultOffsets, heading: "x" })).rejects.toBeInstanceOf(NotPrintableError);
  });
});
