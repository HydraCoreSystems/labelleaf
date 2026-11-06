import { describe, it, expect } from "vitest";
import { checkName } from "./check";
import { parseTypedName, splitAsTyped } from "./parse";
import type { CultivarData, KewData } from "./types";

// TEST FIXTURES ONLY. "Fixtureleaf" is not a real genus and these lists are not
// botanical data. They exist so the Kew and register layers can be tested
// without putting any invented species list into the app. The real data lives
// in src/data and is supplied separately.
const FIXTURE_KEW: KewData = {
  source: "test fixture",
  version: "test",
  genera: {
    fixtureleaf: {
      name: "Fixtureleaf",
      accepted: ["alpha", "bravo", "charlie", "hybridia"],
      hybrids: ["hybridia"],
      synonyms: { oldalpha: "alpha", movedone: "Elsewhere delta" },
    },
  },
};

const FIXTURE_REGISTER: CultivarData = {
  source: "test fixture",
  version: "test",
  genera: {
    fixtureleaf: { register: "Fixtureleaf register", names: ["Silver Star", "Red Moon", "Krimson Fixture"] },
  },
};

describe("format layer", () => {
  it("sets capitals, quotes, and the cultivar for a lazy lowercase entry", () => {
    const r = checkName("hoya pubicalyx silver pink");
    expect(r.offers[0].layer).toBe("format");
    expect(r.offers[0].line1).toBe("Hoya pubicalyx");
    expect(r.offers[0].line2).toBe("'Silver Pink'");
  });

  it("recognizes a name that already follows botanical form", () => {
    const r = checkName("Hoya carnosa 'Krimson Queen'");
    expect(r.offers[0].line1).toBe("Hoya carnosa");
    expect(r.offers[0].line2).toBe("'Krimson Queen'");
    expect(r.offers[0].reason).toBe("This follows botanical form.");
  });

  it("places the hybrid mark from a plain x or the multiplication sign", () => {
    expect(checkName("hoya x carnosa").offers[0].line1).toBe("Hoya × carnosa");
    expect(checkName("Hoya × carnosa").offers[0].line1).toBe("Hoya × carnosa");
  });

  it("handles aff, cf, and sp with or without the dot", () => {
    expect(checkName("hoya aff burmanica").offers[0].line1).toBe("Hoya burmanica aff.");
    expect(checkName("hoya cf. burmanica").offers[0].line1).toBe("Hoya burmanica cf.");
    expect(checkName("Hoya sp.").offers[0].line1).toBe("Hoya sp.");
  });

  it("fixes quotes the grower typed in curly form", () => {
    const r = checkName("Hoya carnosa ‘Krimson Queen’");
    expect(r.offers[0].line2).toBe("'Krimson Queen'");
  });

  it("reads a capitalized second word as the start of a cultivar", () => {
    const r = checkName("Hoya Krimson Queen");
    expect(r.offers[0].line1).toBe("Hoya");
    expect(r.offers[0].line2).toBe("'Krimson Queen'");
  });

  it("returns nothing for empty text", () => {
    expect(checkName("   ").offers).toEqual([]);
  });
});

describe("as typed", () => {
  it("keeps the grower's exact words, split at a quote", () => {
    expect(splitAsTyped("my odd plant 'Thing One'")).toEqual({ line1: "my odd plant", line2: "'Thing One'" });
    expect(splitAsTyped("just words")).toEqual({ line1: "just words", line2: "" });
  });

  it("is returned with every result and never altered by the checker", () => {
    const typed = "hoya  carnosa   krimson queen";
    const r = checkName(typed, { kew: FIXTURE_KEW, cultivars: FIXTURE_REGISTER, usualGenus: "Hoya" });
    expect(r.asTyped.line1).toBe("hoya carnosa krimson queen");
  });
});

describe("parser", () => {
  it("returns blank fields for empty text", () => {
    expect(parseTypedName("").genus).toBe("");
  });

  it("does not invent a genus", () => {
    expect(parseTypedName("").genus).toBe("");
    expect(parseTypedName("carnosa").genus).toBe("carnosa");
  });
});

describe("with no Kew data and no register data", () => {
  it("offers only the format offer and adds no notes", () => {
    const r = checkName("hoya carnosa 'krimson queen'", {
      kew: { source: null, version: null, genera: {} },
      cultivars: { source: null, version: null, genera: {} },
    });
    expect(r.offers).toHaveLength(1);
    expect(r.offers[0].layer).toBe("format");
    expect(r.notes).toEqual([]);
  });

  it("works the same with the data files that ship in the app", async () => {
    const kew = (await import("../data/kew.json")).default as KewData;
    const cultivars = (await import("../data/cultivars.json")).default as CultivarData;
    const r = checkName("hoya carnosa", { kew, cultivars });
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
  });
});

describe("Kew layer", () => {
  const opts = { kew: FIXTURE_KEW };

  it("makes no offer for an accepted name", () => {
    const r = checkName("Fixtureleaf alpha", opts);
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
    expect(r.notes).toEqual([]);
  });

  it("offers the accepted name for a synonym", () => {
    const r = checkName("Fixtureleaf oldalpha", opts);
    const kew = r.offers.find((o) => o.layer === "kew");
    expect(kew?.line1).toBe("Fixtureleaf alpha");
    expect(kew?.reason).toContain("another name for Fixtureleaf alpha");
  });

  it("offers an accepted name in another genus when Kew moved it", () => {
    const r = checkName("Fixtureleaf movedone", opts);
    expect(r.offers.find((o) => o.layer === "kew")?.line1).toBe("Elsewhere delta");
  });

  it("offers likely typo fixes", () => {
    const r = checkName("Fixtureleaf alpa", opts);
    expect(r.offers.some((o) => o.layer === "kew" && o.line1 === "Fixtureleaf alpha")).toBe(true);
  });

  it("marks a hybrid when Kew lists the accepted name as one", () => {
    const r = checkName("Fixtureleaf hybridai", opts);
    expect(r.offers.find((o) => o.layer === "kew")?.line1).toBe("Fixtureleaf × hybridia");
  });

  it("notes a name Kew does not list, and leaves it as typed", () => {
    const r = checkName("Fixtureleaf zzzzzz", opts);
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
    expect(r.notes[0]).toContain("does not list zzzzzz");
  });

  it("stays silent for a genus it does not cover", () => {
    const r = checkName("Othergenus alpha", opts);
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
    expect(r.notes).toEqual([]);
  });
});

describe("cultivar register layer", () => {
  const opts = { kew: FIXTURE_KEW, cultivars: FIXTURE_REGISTER };

  it("offers the registered spelling when capitals are wrong", () => {
    const r = checkName("Fixtureleaf alpha 'SILVER  STAR'", opts);
    const c = r.offers.find((o) => o.layer === "cultivar");
    expect(c?.line2).toBe("'Silver Star'");
    expect(c?.reason).toContain("Registered spelling");
  });

  it("needs no extra offer when the format offer already matches the register", () => {
    const r = checkName("Fixtureleaf alpha 'silver  star'", opts);
    expect(r.offers[0].line2).toBe("'Silver Star'");
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
  });

  it("offers a registered spelling one slip away", () => {
    const r = checkName("Fixtureleaf alpha 'Krimson Fixtur'", opts);
    expect(r.offers.find((o) => o.layer === "cultivar")?.line2).toBe("'Krimson Fixture'");
  });

  it("makes no offer when the spelling already matches", () => {
    const r = checkName("Fixtureleaf alpha 'Red Moon'", opts);
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
  });

  it("notes an unlisted cultivar and keeps it as typed", () => {
    const r = checkName("Fixtureleaf alpha 'Blue Sun'", opts);
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
    expect(r.notes[0]).toContain("does not list Blue Sun");
  });

  it("carries the registered spelling into a Kew offer", () => {
    const r = checkName("Fixtureleaf oldalpha 'silver star'", opts);
    const kew = r.offers.find((o) => o.layer === "kew");
    expect(kew?.line1).toBe("Fixtureleaf alpha");
    expect(kew?.line2).toBe("'Silver Star'");
  });

  it("treats unquoted words after the species as a cultivar", () => {
    const r = checkName("Fixtureleaf alpha silver star", opts);
    expect(r.offers[0].line2).toBe("'Silver Star'");
  });
});

describe("usual genus", () => {
  it("is offered for a lone lowercase word, never applied", () => {
    const r = checkName("carnosa", { usualGenus: "Hoya" });
    expect(r.offers.some((o) => o.layer === "usual" && o.line1 === "Hoya carnosa")).toBe(true);
    expect(r.offers[0].layer).toBe("format");
    expect(r.offers[0].line1).not.toContain("Hoya");
    expect(r.asTyped.line1).toBe("carnosa");
  });

  it("is not offered when no usual genus is set", () => {
    const r = checkName("carnosa");
    expect(r.offers.some((o) => o.layer === "usual")).toBe(false);
    expect(JSON.stringify(r)).not.toContain("Hoya");
  });

  it("is not offered for a full name", () => {
    const r = checkName("Monstera deliciosa", { usualGenus: "Hoya" });
    expect(r.offers.some((o) => o.layer === "usual")).toBe(false);
  });
});

describe("offers never repeat", () => {
  it("lists each distinct name once", () => {
    const r = checkName("Fixtureleaf alpa", { kew: FIXTURE_KEW });
    const ids = r.offers.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("cultivar capitals", () => {
  it("capitalizes a cultivar typed fully in lowercase", () => {
    expect(parseTypedName("hoya carnosa 'krimson queen'").cultivar).toBe("Krimson Queen");
  });

  it("leaves capitals the grower typed alone", () => {
    expect(parseTypedName("Hoya carnosa 'de Vries'").cultivar).toBe("de Vries");
  });
});
