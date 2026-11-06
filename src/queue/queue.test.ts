import { describe, it, expect } from "vitest";
import {
  addCuttingRun,
  addEntry,
  entryFromOffer,
  entryFromTyped,
  moveEntry,
  nextCuttingSeq,
  queueToCsv,
  removeEntry,
  updateEntry,
  type QueueEntry,
} from "./queue";
import { checkName } from "../checker/check";

function plant(id: string, line1: string, line2 = ""): QueueEntry {
  return { id, typed: `${line1} ${line2}`.trim(), line1, line2, name: null, source: "typed", kind: "plant" };
}

describe("adding names", () => {
  it("adds an accepted offer as the label lines it shows", () => {
    const typed = "hoya pubicalyx silver pink";
    const offer = checkName(typed).offers[0];
    const q = addEntry([], entryFromOffer(typed, offer, "a"));
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ line1: "Hoya pubicalyx", line2: "'Silver Pink'", source: "offer", kind: "plant", typed });
  });

  it("adds a name no layer knows exactly as typed", () => {
    const typed = "my odd plant 'Thing One'";
    const q = addEntry([], entryFromTyped(typed, checkName(typed).asTyped, "a"));
    expect(q[0]).toMatchObject({ line1: "my odd plant", line2: "'Thing One'", source: "typed", name: null });
  });
});

describe("editing, reordering, removing", () => {
  const base = [plant("a", "Alpha"), plant("b", "Bravo"), plant("c", "Charlie")];

  it("edits one entry and leaves the rest alone", () => {
    const q = updateEntry(base, "b", { line1: "Bravo changed" });
    expect(q.map((e) => e.line1)).toEqual(["Alpha", "Bravo changed", "Charlie"]);
    expect(base[1].line1).toBe("Bravo"); // original list not mutated
  });

  it("removes one entry", () => {
    expect(removeEntry(base, "b").map((e) => e.id)).toEqual(["a", "c"]);
  });

  it("moves an entry up, down, and to the ends", () => {
    expect(moveEntry(base, "c", 0).map((e) => e.id)).toEqual(["c", "a", "b"]);
    expect(moveEntry(base, "a", 1).map((e) => e.id)).toEqual(["b", "a", "c"]);
    expect(moveEntry(base, "a", 99).map((e) => e.id)).toEqual(["b", "c", "a"]);
    expect(moveEntry(base, "b", -5).map((e) => e.id)).toEqual(["b", "a", "c"]);
  });

  it("leaves the list alone for an unknown id or an unchanged position", () => {
    expect(moveEntry(base, "zzz", 0)).toBe(base);
    expect(moveEntry(base, "a", 0)).toBe(base);
  });
});

describe("cutting runs", () => {
  const base = [plant("a", "Hoya burmanica", "'Silver'"), plant("b", "Monstera deliciosa")];

  it("makes exactly one labeled cutting per cutting, with its own mark", () => {
    const q = addCuttingRun(base, { parentId: "a", count: 10, startSeq: 1 });
    const cuttings = q.filter((e) => e.kind === "cutting");
    expect(cuttings).toHaveLength(10);
    expect(cuttings.map((c) => c.mark)).toEqual(["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10"]);
    expect(new Set(cuttings.map((c) => c.id)).size).toBe(10);
    for (const c of cuttings) {
      expect(c.line1).toBe("Hoya burmanica");
      expect(c.line2).toBe("'Silver'");
      expect(c.parentId).toBe("a");
    }
  });

  it("starts at a chosen number, in the style of C08", () => {
    const q = addCuttingRun(base, { parentId: "a", count: 3, startSeq: 8 });
    expect(q.filter((e) => e.kind === "cutting").map((c) => c.mark)).toEqual(["C08", "C09", "C10"]);
  });

  it("places the run right after its plant, ahead of the next plant", () => {
    const q = addCuttingRun(base, { parentId: "a", count: 2 });
    expect(q.map((e) => e.id)).toEqual(["a", "a-C01", "a-C02", "b"]);
  });

  it("continues the numbering when the plant already has cuttings", () => {
    let q = addCuttingRun(base, { parentId: "a", count: 3 });
    expect(nextCuttingSeq(q, "a")).toBe(4);
    q = addCuttingRun(q, { parentId: "a", count: 2 });
    expect(q.filter((e) => e.kind === "cutting").map((c) => c.mark)).toEqual(["C01", "C02", "C03", "C04", "C05"]);
    expect(q.map((e) => e.id).slice(-1)).toEqual(["b"]);
  });

  it("refuses a repeated mark for the same plant", () => {
    const q = addCuttingRun(base, { parentId: "a", count: 3 });
    expect(() => addCuttingRun(q, { parentId: "a", count: 2, startSeq: 3 })).toThrow(/already in the queue/);
  });

  it("refuses counts and starts outside 1 to 99", () => {
    expect(() => addCuttingRun(base, { parentId: "a", count: 0 })).toThrow();
    expect(() => addCuttingRun(base, { parentId: "a", count: 100 })).toThrow();
    expect(() => addCuttingRun(base, { parentId: "a", count: 5, startSeq: 97 })).toThrow(/C01 to C99/);
    expect(() => addCuttingRun(base, { parentId: "nope", count: 2 })).toThrow(/not found/);
  });

  it("only runs from a plant, not from a cutting", () => {
    const q = addCuttingRun(base, { parentId: "a", count: 1 });
    expect(() => addCuttingRun(q, { parentId: "a-C01", count: 1 })).toThrow(/plant entry/);
  });
});

describe("CSV export", () => {
  it("writes a header and one row per label in print order", () => {
    const q = addCuttingRun([plant("a", "Hoya burmanica", "'Silver'")], { parentId: "a", count: 2 });
    const csv = queueToCsv(q).split("\r\n");
    expect(csv[0]).toBe("Position,Line 1,Line 2,Mark,As typed");
    expect(csv[1]).toBe("1,Hoya burmanica,'Silver',,Hoya burmanica 'Silver'");
    expect(csv[2]).toBe("2,Hoya burmanica,'Silver',C01,Hoya burmanica 'Silver'");
    expect(csv[3]).toBe("3,Hoya burmanica,'Silver',C02,Hoya burmanica 'Silver'");
    expect(csv[4]).toBe("");
  });

  it("quotes fields with commas and doubles quote marks", () => {
    const e: QueueEntry = { ...plant("a", 'Name, with comma', 'say "hi"'), typed: "x" };
    const row = queueToCsv([e]).split("\r\n")[1];
    expect(row).toBe('1,"Name, with comma","say ""hi""",,x');
  });

  it("exports an empty queue as just the header", () => {
    expect(queueToCsv([])).toBe("Position,Line 1,Line 2,Mark,As typed\r\n");
  });
});
