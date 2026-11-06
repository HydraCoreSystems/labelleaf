import { describe, it, expect } from "vitest";
import { sizeClassForLine, parseStartPosition, chunkIntoSheets, LABELS_PER_SHEET } from "./labels";

// Commerce Center assertions, carried over unchanged. The two scan URL
// assertions went away with the QR and scan code they tested, which stays
// behind in the Commerce Center.

describe("labels helpers", () => {
  it("determines size tier by character length", () => {
    expect(sizeClassForLine("Hoya")).toBe("lg");
    expect(sizeClassForLine("Hoya burmanica")).toBe("md");
    expect(sizeClassForLine("Hoya pubicalyx 'Silver Pink'")).toBe("xs");
  });

  it("parses start position safely within 1..30", () => {
    expect(parseStartPosition("1")).toBe(1);
    expect(parseStartPosition("15")).toBe(15);
    expect(parseStartPosition("30")).toBe(30);
    expect(parseStartPosition("0")).toBe(1);
    expect(parseStartPosition("31")).toBe(30);
    expect(parseStartPosition("invalid")).toBe(1);
  });

  it("chunks items into sheets with leading blanks on first sheet only", () => {
    const items = Array.from({ length: 35 }, (_, i) => `item-${i + 1}`);
    const sheets = chunkIntoSheets(items, 5); // start at position 5 (4 blanks)

    expect(sheets).toHaveLength(2);
    expect(sheets[0].blanks).toBe(4);
    expect(sheets[0].items).toHaveLength(26); // 30 - 4 = 26
    expect(sheets[1].blanks).toBe(0);
    expect(sheets[1].items).toHaveLength(9); // remaining 35 - 26 = 9
  });
});

describe("new in LabelLeaf", () => {
  it("keeps 30 labels per sheet", () => {
    expect(LABELS_PER_SHEET).toBe(30);
  });

  it("returns no sheets for an empty run", () => {
    expect(chunkIntoSheets([], 1)).toEqual([]);
  });

  it("fills exactly one sheet from slot 1 with 30 items", () => {
    const sheets = chunkIntoSheets(Array.from({ length: 30 }, (_, i) => i), 1);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].blanks).toBe(0);
    expect(sheets[0].items).toHaveLength(30);
  });

  it("spills one label onto a second sheet when starting at slot 30 with two items", () => {
    const sheets = chunkIntoSheets(["a", "b"], 30);
    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toEqual({ blanks: 29, items: ["a"] });
    expect(sheets[1]).toEqual({ blanks: 0, items: ["b"] });
  });
});
