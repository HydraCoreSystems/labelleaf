import { describe, it, expect } from "vitest";
import {
  composeBotanicalLine1,
  composeBotanicalLine2,
  composeDisplayName,
} from "./naming";

// The three describe blocks below are the Commerce Center assertions, carried
// over unchanged. Only the import path differs.

describe("composeBotanicalLine1", () => {
  it("formats standard species", () => {
    expect(composeBotanicalLine1({ genus: "Hoya", species: "burmanica" })).toBe("Hoya burmanica");
  });

  it("handles form codes like aff, cf, and sp", () => {
    expect(composeBotanicalLine1({ genus: "Hoya", species: "burmanica", form_code: "aff" })).toBe("Hoya burmanica aff.");
    expect(composeBotanicalLine1({ genus: "Hoya", species: "burmanica", form_code: "cf" })).toBe("Hoya burmanica cf.");
    expect(composeBotanicalLine1({ genus: "Hoya", species: null, form_code: "sp" })).toBe("Hoya sp.");
  });

  it("handles hybrids", () => {
    expect(composeBotanicalLine1({ genus: "Hoya", species: "carnosa", hybrid: true })).toBe("Hoya × carnosa");
  });
});

describe("composeBotanicalLine2", () => {
  it("wraps cultivar in quotes", () => {
    expect(composeBotanicalLine2({ cultivar: "Ricardo", name_type: "Cultivar" })).toBe("'Ricardo'");
    expect(composeBotanicalLine2({ cultivar: "Black Magic", name_type: null })).toBe("'Black Magic'");
  });

  it("does not wrap form or descriptor", () => {
    expect(composeBotanicalLine2({ cultivar: "Splash", name_type: "Form" })).toBe("Splash");
    expect(composeBotanicalLine2({ cultivar: "Round Leaves", name_type: "Descriptor" })).toBe("Round Leaves");
  });
});

describe("composeDisplayName", () => {
  it("combines line 1 and line 2 cleanly", () => {
    expect(composeDisplayName("Hoya burmanica", "")).toBe("Hoya burmanica");
    expect(composeDisplayName("Hoya", "'Ricardo'")).toBe("Hoya 'Ricardo'");
  });
});

// New in LabelLeaf: the blank genus decision from the build brief.

describe("blank genus is never silently defaulted", () => {
  it("does not turn a blank genus into Hoya", () => {
    expect(composeBotanicalLine1({ genus: "", species: "carnosa" })).toBe("carnosa");
    expect(composeBotanicalLine1({ genus: null, species: "carnosa" })).toBe("carnosa");
    expect(composeBotanicalLine1({ species: "carnosa" })).toBe("carnosa");
    expect(composeBotanicalLine1({})).toBe("");
    expect(composeBotanicalLine1({ form_code: "sp" })).toBe("sp.");
  });

  it("never produces the word Hoya unless the grower typed it", () => {
    const blanks = [{}, { genus: "" }, { genus: "   " }, { genus: null, species: "x" }];
    for (const f of blanks) {
      expect(composeBotanicalLine1(f).toLowerCase()).not.toContain("hoya");
    }
  });

  it("still capitalizes a typed genus word by word", () => {
    expect(composeBotanicalLine1({ genus: "  monstera  ", species: " DELICIOSA " })).toBe("Monstera deliciosa");
  });

  it("strips quotes the grower typed before wrapping a cultivar", () => {
    expect(composeBotanicalLine2({ cultivar: "'Krimson Queen'" })).toBe("'Krimson Queen'");
    expect(composeBotanicalLine2({ cultivar: "“Krimson Queen”" })).toBe("'Krimson Queen'");
  });
});
