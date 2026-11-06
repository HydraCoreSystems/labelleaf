import { describe, it, expect } from "vitest";
import { WcvpAccumulator, detectDelimiter, parseHeader, parseRow } from "./wcvp";

// TEST FIXTURE ONLY. Fake genera and fake epithets, in the same column layout
// as Kew's wcvp_names.csv. This is not botanical data and is never bundled.
const HEADER =
  "plant_name_id|ipni_id|taxon_rank|taxon_status|family|genus_hybrid|genus|species_hybrid|species|infraspecific_rank|infraspecies|taxon_name|accepted_plant_name_id";

function line(id: string, rank: string, status: string, genus: string, hybridMark: string, species: string, accepted: string, infra = "") {
  return [id, "", rank, status, "Fixtureaceae", "", genus, hybridMark, species, infra ? "subsp." : "", infra, `${genus} ${species}`, accepted].join("|");
}

const ROWS = [
  line("1", "Species", "Accepted", "Fixtureleaf", "", "Alpha", "1"),
  line("2", "Species", "Accepted", "Fixtureleaf", "×", "Hybridia", "2"),
  line("3", "Species", "Synonym", "Fixtureleaf", "", "Oldalpha", "1"),
  line("4", "Species", "Synonym", "Fixtureleaf", "", "Movedone", "9"),
  line("5", "Subspecies", "Accepted", "Fixtureleaf", "", "Alpha", "5", "extra"),
  line("6", "Species", "Accepted", "Notcovered", "", "Zeta", "6"),
  line("7", "Species", "Misapplied", "Fixtureleaf", "", "Misapplied", "1"),
  // The accepted name for row 4 lives in a genus the app does not cover.
  line("9", "Species", "Accepted", "Elsewhere", "", "Delta", "9"),
];

function run(genera: string[]) {
  const header = parseHeader(HEADER);
  const rows = ROWS.map((l) => parseRow(l, header.delimiter, header.columns));
  const acc = new WcvpAccumulator(genera);
  rows.forEach((r) => acc.addRow(r));
  if (acc.missingIds().size) rows.forEach((r) => acc.addLookup(r));
  return { acc, data: acc.build("fixture", "test") };
}

describe("WCVP importer", () => {
  it("detects the pipe delimiter Kew uses", () => {
    expect(detectDelimiter(HEADER)).toBe("|");
    expect(detectDelimiter("a,b,c")).toBe(",");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
  });

  it("stops with a clear message when a needed column is missing", () => {
    expect(() => parseHeader("plant_name_id|genus|species")).toThrow(/missing columns/);
  });

  it("keeps accepted species of the covered genus, lowercase and sorted", () => {
    const { data } = run(["Fixtureleaf"]);
    expect(data.genera.fixtureleaf.accepted).toEqual(["alpha", "hybridia"]);
    expect(data.genera.fixtureleaf.hybrids).toEqual(["hybridia"]);
  });

  it("maps synonyms to their accepted name", () => {
    const { data } = run(["Fixtureleaf"]);
    expect(data.genera.fixtureleaf.synonyms.oldalpha).toBe("alpha");
  });

  it("resolves a synonym whose accepted name sits in an uncovered genus", () => {
    const { acc, data } = run(["Fixtureleaf"]);
    expect(data.genera.fixtureleaf.synonyms.movedone).toBe("Elsewhere delta");
    expect(acc.missingIds().size).toBe(0);
  });

  it("skips other ranks, uncovered genera, and misapplied names", () => {
    const { data } = run(["Fixtureleaf"]);
    expect(Object.keys(data.genera)).toEqual(["fixtureleaf"]);
    expect(data.genera.fixtureleaf.synonyms.misapplied).toBeUndefined();
    expect(data.genera.fixtureleaf.accepted).not.toContain("zeta");
  });

  it("records the source and version it was given", () => {
    const { data } = run(["Fixtureleaf"]);
    expect(data.source).toBe("fixture");
    expect(data.version).toBe("test");
  });
});
