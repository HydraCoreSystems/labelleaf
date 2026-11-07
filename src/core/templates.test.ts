import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  TEMPLATES,
  TEMPLATE_ORDER,
  DEFAULT_TEMPLATE,
  PAGE,
  isPrintable,
  resolveOffsets,
  clampOffset,
  slotRect,
  MAX_OFFSET_IN,
  firstPrintableTemplate,
} from "./templates";

describe("Avery 5160 geometry, lifted from the Commerce Center", () => {
  const t = TEMPLATES.avery5160;
  const layout = t.layout!;

  it("is printable and holds 30 labels", () => {
    expect(isPrintable(t)).toBe(true);
    expect(layout.columns * layout.rows).toBe(30);
    expect(t.labelsPerSheet).toBe(30);
  });

  it("keeps the published sheet numbers", () => {
    expect(layout.labelWidthIn).toBe(2.625);
    expect(layout.labelHeightIn).toBe(1);
    expect(layout.pitchXIn).toBe(2.75);
    expect(layout.pitchYIn).toBe(1);
    expect(layout.marginTopIn).toBe(0.5);
    expect(layout.marginLeftIn).toBe(0.1875);
  });

  it("keeps the measured calibration numbers", () => {
    expect(t.defaultOffsets).toEqual({ xIn: 0.03, yIn: 0.07 });
    expect(t.content).toEqual({
      widthIn: 2.3,
      heightIn: 0.68,
      paddingXIn: 0.04,
      paddingYIn: 0.02,
      scale: 0.96,
    });
  });

  it("fits the whole grid inside the page with matching right and bottom margins", () => {
    const last = slotRect(layout, 30);
    expect(last.xIn + last.widthIn).toBeCloseTo(PAGE.widthIn - layout.marginLeftIn, 6);
    expect(last.yIn + last.heightIn).toBeCloseTo(PAGE.heightIn - layout.marginTopIn, 6);
  });
});

describe("slotRect", () => {
  const layout = TEMPLATES.avery5160.layout!;

  it("numbers slots left to right, then down", () => {
    expect(slotRect(layout, 1)).toMatchObject({ row: 1, col: 1, xIn: 0.1875, yIn: 0.5 });
    expect(slotRect(layout, 2)).toMatchObject({ row: 1, col: 2, xIn: 2.9375, yIn: 0.5 });
    expect(slotRect(layout, 3)).toMatchObject({ row: 1, col: 3, xIn: 5.6875, yIn: 0.5 });
    expect(slotRect(layout, 4)).toMatchObject({ row: 2, col: 1, xIn: 0.1875, yIn: 1.5 });
    expect(slotRect(layout, 30)).toMatchObject({ row: 10, col: 3, xIn: 5.6875, yIn: 9.5 });
  });
});

describe("Avery 8257, the lead template", () => {
  const t = TEMPLATES.avery8257;

  it("leads the template list", () => {
    expect(TEMPLATE_ORDER[0]).toBe("avery8257");
    expect(TEMPLATE_ORDER[1]).toBe("avery5160");
    expect(DEFAULT_TEMPLATE).toBe("avery8257");
  });

  it("holds 30 labels", () => {
    expect(t.labelsPerSheet).toBe(30);
  });

  it("does not carry the 5160 measured offsets", () => {
    expect(t.defaultOffsets).toEqual({ xIn: 0, yIn: 0 });
  });

  it("is printable, with the grid from the published Avery 6870 table", () => {
    expect(isPrintable(t)).toBe(true);
    expect(t.layout).toEqual({
      columns: 3,
      rows: 10,
      labelWidthIn: 2.25,
      labelHeightIn: 0.75,
      pitchXIn: 2.75,
      pitchYIn: 1,
      marginTopIn: 0.625,
      marginLeftIn: 0.375,
    });
    expect(t.provenance).toContain("published Avery");
  });

  it("closes to the US Letter sheet both ways", () => {
    const l = t.layout!;
    const gutterX = l.pitchXIn - l.labelWidthIn;
    const gutterY = l.pitchYIn - l.labelHeightIn;
    expect(gutterX).toBe(0.5);
    expect(gutterY).toBe(0.25);
    // The right and bottom margins equal the left and top ones on the published table.
    expect(l.marginLeftIn * 2 + l.columns * l.labelWidthIn + (l.columns - 1) * gutterX).toBeCloseTo(PAGE.widthIn, 9);
    expect(l.marginTopIn * 2 + l.rows * l.labelHeightIn + (l.rows - 1) * gutterY).toBeCloseTo(PAGE.heightIn, 9);
  });

  it("places the corner slots where the table says", () => {
    const l = t.layout!;
    expect(slotRect(l, 1)).toMatchObject({ row: 1, col: 1, xIn: 0.375, yIn: 0.625 });
    expect(slotRect(l, 3)).toMatchObject({ row: 1, col: 3, xIn: 5.875, yIn: 0.625 });
    expect(slotRect(l, 30)).toMatchObject({ row: 10, col: 3, xIn: 5.875, yIn: 9.625 });
    const last = slotRect(l, 30);
    expect(last.xIn + last.widthIn).toBeCloseTo(8.125, 9);
    expect(last.yIn + last.heightIn).toBeCloseTo(10.375, 9);
  });

  it("keeps its content box inside the label", () => {
    const l = t.layout!;
    const c = t.content!;
    expect(c.widthIn).toBeLessThanOrEqual(l.labelWidthIn);
    expect(c.heightIn).toBeLessThanOrEqual(l.labelHeightIn);
  });
});

describe("first printable template", () => {
  it("is the lead template now that 8257 can print", () => {
    expect(firstPrintableTemplate()).toBe("avery8257");
    expect(isPrintable(TEMPLATES[firstPrintableTemplate()])).toBe(true);
  });
});

describe("remembered offsets", () => {
  const t = TEMPLATES.avery5160;

  it("fall back to the template defaults when nothing is stored", () => {
    expect(resolveOffsets(t, null)).toEqual({ xIn: 0.03, yIn: 0.07 });
    expect(resolveOffsets(t, undefined)).toEqual({ xIn: 0.03, yIn: 0.07 });
  });

  it("use stored offsets when present", () => {
    expect(resolveOffsets(t, { xIn: -0.02, yIn: 0.11 })).toEqual({ xIn: -0.02, yIn: 0.11 });
  });

  it("ignore stored offsets that are not numbers", () => {
    expect(resolveOffsets(t, { xIn: NaN, yIn: 0.1 })).toEqual({ xIn: 0.03, yIn: 0.07 });
  });

  it("clamp nudges to a safe range and round to a thousandth", () => {
    expect(clampOffset(1)).toBe(MAX_OFFSET_IN);
    expect(clampOffset(-1)).toBe(-MAX_OFFSET_IN);
    expect(clampOffset(0.0301)).toBe(0.03);
    expect(clampOffset(NaN)).toBe(0);
  });
});

// The Commerce Center held the same numbers in three files. This guard fails
// the build if a measured number reappears outside templates.ts.
describe("calibration numbers live in exactly one place", () => {
  const srcRoot = join(__dirname, "..");
  const measured = [/\b0\.07\b/, /\b0\.96\b/, /\b2\.625\b/, /\b0\.1875\b/, /\b2\.75\b/, /\b2\.3\b/, /\b0\.68\b/];

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return walk(p);
      return /\.(ts|tsx)$/.test(name) ? [p] : [];
    });
  }

  it("finds no measured number in any other source file", () => {
    const offenders: string[] = [];
    for (const file of walk(srcRoot)) {
      const rel = relative(srcRoot, file);
      if (rel === join("core", "templates.ts")) continue;
      if (/\.test\.tsx?$/.test(rel)) continue;
      const text = readFileSync(file, "utf8");
      for (const re of measured) {
        if (re.test(text)) offenders.push(`${rel} contains ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
