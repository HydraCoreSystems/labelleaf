import { describe, it, expect } from "vitest";
import { Buffer } from "node:buffer";
import { COPY, describeOffset } from "./copy";
import { TEMPLATES } from "../core/templates";
import { checkName } from "../checker/check";
import { planRun } from "../picker/slots";
import { NotPrintableError, buildLabelPdf } from "../pdf/sheet";
import { addCuttingRun, type QueueEntry } from "../queue/queue";
import { bytesToBase64, pdfDataUri } from "../pdf/base64";

// Dash characters: hyphen minus, the Unicode hyphens, en dash, em dash, minus sign.
const DASH = /[-‐-―−]/;

function collect(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (typeof value === "function") {
    // Call each copy function with plain sample values.
    const f = value as (...a: any[]) => unknown;
    for (const args of [[1], [2], [1, 1, 0], [3, 5, 4], [["Hoya"], null], [["Hoya", "Monstera"], "v1"], [["Hoya"]], [1, 3]]) {
      try {
        const r = f(...args);
        if (typeof r === "string") out.push(r);
      } catch {
        /* wrong sample for this function, skip */
      }
    }
  } else if (value && typeof value === "object") Object.values(value).forEach((v) => collect(v, out));
  return out;
}

describe("house rules for in app copy", () => {
  it("has no dash or hyphen character in any fixed text", () => {
    const strings = collect(COPY);
    expect(strings.length).toBeGreaterThan(50);
    const bad = strings.filter((s) => DASH.test(s));
    expect(bad).toEqual([]);
  });

  it("has no dash in the offset descriptions, including negative nudges", () => {
    for (const [x, y] of [[0, 0], [0.03, 0.07], [-0.02, -0.11], [0.25, -0.25]]) {
      const d = describeOffset(x, y);
      expect(DASH.test(d.sideways + d.vertical)).toBe(false);
    }
    expect(describeOffset(-0.02, 0.07)).toEqual({ sideways: "Left 0.02 in", vertical: "Down 0.07 in" });
    expect(describeOffset(0, -0.1)).toEqual({ sideways: "Centered", vertical: "Up 0.10 in" });
  });

  it("has no dash in the sheet descriptions", () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(DASH.test(t.name + t.stock)).toBe(false);
    }
  });

  it("has no dash in the slot plan warning or the checker's reasons and notes", () => {
    expect(DASH.test(planRun(25, 10).warning ?? "")).toBe(false);
    const r = checkName("hoya carnosa 'krimson queen'", { usualGenus: "Hoya" });
    for (const o of r.offers) expect(DASH.test(o.reason)).toBe(false);
    const lone = checkName("carnosa", { usualGenus: "Hoya" });
    for (const o of lone.offers) expect(DASH.test(o.reason)).toBe(false);
  });

  it("has no dash in error messages the grower can see", async () => {
    const e = (id: string): QueueEntry => ({ id, typed: "t", line1: "A", line2: "", name: null, source: "typed", kind: "plant" });
    const messages: string[] = [];
    for (const input of [{ parentId: "a", count: 0 }, { parentId: "a", count: 5, startSeq: 97 }, { parentId: "zz", count: 1 }]) {
      try {
        addCuttingRun([e("a")], input);
      } catch (err) {
        messages.push((err as Error).message);
      }
    }
    messages.push(new NotPrintableError("Avery 8257").message);
    expect(messages.length).toBe(4);
    for (const m of messages) expect(DASH.test(m)).toBe(false);
  });

  it("has no dash in the print warnings", async () => {
    const built = await buildLabelPdf({
      template: TEMPLATES.avery5160,
      offsets: { xIn: 0, yIn: 0 },
      items: [{ line1: "Hoya " + "megalocephalus".repeat(6), line2: "" }, { line1: "Hoya Ω", line2: "" }],
      startSlot: 1,
    });
    expect(built.warnings.length).toBeGreaterThan(0);
    for (const w of built.warnings) expect(DASH.test(w.message)).toBe(false);
  });

  it("uses US spelling in the words most likely to slip", () => {
    const text = collect(COPY).join(" ").toLowerCase();
    for (const word of ["colour", "centre", "grey", "programme", "licence", "metre", "organis", "favour"]) {
      expect(text.includes(word)).toBe(false);
    }
  });
});

describe("base64 for printing", () => {
  it("matches the standard encoding for every length remainder", () => {
    for (const len of [0, 1, 2, 3, 4, 5, 255, 1000]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 255);
      expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
    }
  });

  it("builds a PDF data address", async () => {
    const built = await buildLabelPdf({ template: TEMPLATES.avery5160, offsets: { xIn: 0, yIn: 0 }, items: [{ line1: "Hoya", line2: "" }], startSlot: 1 });
    const uri = pdfDataUri(built.bytes);
    expect(uri.startsWith("data:application/pdf;base64,")).toBe(true);
    expect(Buffer.from(uri.split(",")[1], "base64").subarray(0, 5).toString()).toBe("%PDF-");
  });
});
