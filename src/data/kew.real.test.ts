import { describe, it, expect } from "vitest";
import { checkName } from "../checker/check";
import { KEW, coveredGenera } from "./index";

// These tests read the Kew data that ships in the app (src/data/kew.json,
// built from the WCVP extract Lotus supplied). They check real botanical
// facts, so if the data file is swapped they show what changed.

const GENERA = [
  "Alocasia", "Anthurium", "Begonia", "Calathea", "Cattleya", "Ceropegia", "Dendrobium", "Dischidia",
  "Epipremnum", "Hoya", "Monstera", "Peperomia", "Phalaenopsis", "Philodendron", "Stephanotis", "Syngonium",
];

describe("bundled Kew data", () => {
  it("names its source and version", () => {
    expect(KEW.source).toContain("WCVP");
    expect(KEW.version).toContain("v16");
  });

  it("covers hoyas and the fifteen trade genera, and nothing else", () => {
    expect([...coveredGenera(KEW)].sort()).toEqual(GENERA);
  });

  it("holds a real spread of accepted names for every genus", () => {
    for (const key of Object.keys(KEW.genera)) {
      expect(KEW.genera[key].accepted.length, key).toBeGreaterThan(10);
    }
    expect(KEW.genera.hoya.accepted.length).toBeGreaterThan(500);
  });

  it("keeps every epithet lowercase and single word", () => {
    for (const g of Object.values(KEW.genera)) {
      for (const e of [...g.accepted, ...Object.keys(g.synonyms), ...(g.listed ?? [])]) {
        expect(e).toMatch(/^[a-z-]+$/);
      }
    }
  });

  it("never lists one epithet as both accepted and a synonym", () => {
    for (const g of Object.values(KEW.genera)) {
      const acc = new Set(g.accepted);
      for (const e of Object.keys(g.synonyms)) expect(acc.has(e)).toBe(false);
    }
  });
});

describe("the checker against the real data", () => {
  const opts = { kew: KEW };

  it("recognizes real hoyas without a note or an extra offer", () => {
    for (const name of ["Hoya carnosa", "Hoya kerrii", "Hoya pubicalyx", "Hoya archboldiana"]) {
      const r = checkName(name, opts);
      expect(r.notes, name).toEqual([]);
      expect(r.offers.map((o) => o.layer), name).toEqual(["format"]);
    }
  });

  it("offers the right spelling for a typo", () => {
    const r = checkName("hoya carnsa", opts);
    expect(r.offers.some((o) => o.layer === "kew" && o.line1 === "Hoya carnosa")).toBe(true);
  });

  it("offers Kew's accepted name for a real synonym", () => {
    const r = checkName("Monstera borsigiana", opts);
    expect(r.offers.find((o) => o.layer === "kew")?.line1).toBe("Monstera deliciosa");
  });

  it("offers an accepted name in another genus when Kew moved the species", () => {
    const r = checkName("Hoya africana", opts);
    expect(r.offers.find((o) => o.layer === "kew")?.line1).toBe("Stephanotis abyssinica");
  });

  it("offers the hybrid mark for a Kew hybrid typed without one", () => {
    const r = checkName("hoya tuafanua", opts);
    expect(r.offers.find((o) => o.layer === "kew")?.line1).toBe("Hoya × tuafanua");
  });

  it("covers the trade genera too", () => {
    for (const name of ["Philodendron hederaceum", "Monstera deliciosa", "Begonia rex", "Calathea ornata"]) {
      const r = checkName(name, opts);
      expect(r.notes, name).toEqual([]);
    }
  });

  it("notes a name Kew does not list and leaves it as typed", () => {
    const r = checkName("Hoya zzzznotreal", opts);
    expect(r.notes[0]).toContain("does not list zzzznotreal");
    expect(r.offers).toHaveLength(1);
    expect(r.offers[0].line1).toBe("Hoya zzzznotreal");
  });

  it("stays silent for a genus the data does not cover", () => {
    const r = checkName("Rosa canina", opts);
    expect(r.notes).toEqual([]);
    expect(r.offers.map((o) => o.layer)).toEqual(["format"]);
  });
});
