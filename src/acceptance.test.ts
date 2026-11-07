import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { checkName } from "./checker/check";
import { TEMPLATES, resolveOffsets } from "./core/templates";
import { planRun } from "./picker/slots";
import { buildLabelPdf } from "./pdf/sheet";
import { addCuttingRun, addEntry, entryFromOffer, queueToCsv, toLabelContent, type QueueEntry } from "./queue/queue";
import { MemoryStore, defaultState, loadState, saveState } from "./storage/storage";

// The brief's acceptance pass, run through the same functions the screens call.
// The real print on real stock, with Crystal's iPhone, is the part software
// cannot check. See BUILD_STATUS.md.

const T = TEMPLATES.avery5160;
const OFF = resolveOffsets(T, T.defaultOffsets);

async function pageItems(bytes: Uint8Array) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const out: { str: string; x: number; yUp: number; size: number; page: number }[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    out.push(
      tc.items
        .filter((i: any) => typeof i.str === "string" && i.str.trim())
        .map((i: any) => ({ str: i.str, x: i.transform[4], yUp: i.transform[5], size: Math.abs(i.transform[0]), page: n }))
    );
  }
  return out;
}

function queueOf(names: string[]): QueueEntry[] {
  return names.reduce<QueueEntry[]>((q, typed, i) => addEntry(q, entryFromOffer(typed, checkName(typed).offers[0], `p${i}`)), []);
}

describe("acceptance: a full sheet prints aligned", () => {
  it("prints 30 labels, one per slot, on one US Letter page", async () => {
    const names = Array.from({ length: 30 }, (_, i) => `hoya species${String.fromCharCode(97 + (i % 26))}${i}`);
    const q = queueOf(names);
    const plan = planRun(1, q.length);
    expect(plan.spillsOntoSecondSheet).toBe(false);
    const built = await buildLabelPdf({ template: T, offsets: OFF, items: q.map(toLabelContent), startSlot: 1 });
    expect(built.sheets).toBe(1);
    const pages = await pageItems(built.bytes);
    expect(pages[0]).toHaveLength(30);
    // Left edges fall on exactly three columns, ten rows.
    const xs = new Set(pages[0].map((i) => Math.round(i.x * 100)));
    const ys = new Set(pages[0].map((i) => Math.round(i.yUp * 100)));
    expect(xs.size).toBe(3);
    expect(ys.size).toBe(10);
  });
});

describe("acceptance: a partly used sheet starts at the chosen slot", () => {
  it("leaves 17 slots blank, fills 18 onward, and the picker agrees with the PDF", async () => {
    const q = queueOf(["hoya carnosa", "hoya kerrii", "hoya pubicalyx"]);
    const plan = planRun(18, q.length);
    expect(plan.sheets[0].blankSlots).toHaveLength(17);
    expect(plan.sheets[0].filledSlots).toEqual([18, 19, 20]);
    const built = await buildLabelPdf({ template: T, offsets: OFF, items: q.map(toLabelContent), startSlot: 18 });
    const pages = await pageItems(built.bytes);
    expect(pages[0]).toHaveLength(3);
    // Slot 18 is row 6, so every label sits below the top five rows.
    const topOfRow6 = 792 - (0.5 + 5 * 1) * 72;
    for (const i of pages[0]) expect(i.yUp).toBeLessThan(topOfRow6);
  });
});

describe("acceptance: a cutting run prints one label per cutting with its marks", () => {
  it("makes 8 labels C01 to C08 with the plant's two lines on each", async () => {
    let q = queueOf(["hoya carnosa 'krimson queen'"]);
    q = addCuttingRun(q, { parentId: "p0", count: 8 });
    const cuttings = q.filter((e) => e.kind === "cutting");
    expect(cuttings).toHaveLength(8);
    const built = await buildLabelPdf({ template: T, offsets: OFF, items: cuttings.map(toLabelContent), startSlot: 1 });
    const pages = await pageItems(built.bytes);
    const marks = pages[0].filter((i) => /^C\d\d$/.test(i.str)).map((i) => i.str);
    expect(marks.sort()).toEqual(["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08"]);
    expect(pages[0].filter((i) => i.str === "Hoya carnosa")).toHaveLength(8);
    expect(pages[0].filter((i) => i.str === "'Krimson Queen'")).toHaveLength(8);
  });

  it("starts at C08 when asked", () => {
    const q = addCuttingRun(queueOf(["hoya carnosa"]), { parentId: "p0", count: 2, startSeq: 8 });
    expect(q.filter((e) => e.kind === "cutting").map((c) => c.mark)).toEqual(["C08", "C09"]);
  });
});

describe("acceptance: a long hoya name fits its label under the tier rules", () => {
  it("fits one line at or above the readable floor, with no warning", async () => {
    const q = queueOf(["hoya archboldiana x pubicalyx cf."]);
    expect(q[0].line1).toBe("Hoya archboldiana × pubicalyx cf.");
    const built = await buildLabelPdf({ template: T, offsets: OFF, items: q.map(toLabelContent), startSlot: 1 });
    expect(built.warnings).toEqual([]);
    const [page] = await pageItems(built.bytes);
    const item = page.find((i) => i.str === q[0].line1)!;
    expect(item).toBeDefined();
    const pdf = await PDFDocument.create();
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const effW = 2.3 * 0.96;
    const right = (0.1875 + (2.625 - effW) / 2 + effW - 0.04 * 0.96) * 72;
    expect(item.x + bold.widthOfTextAtSize(q[0].line1, item.size)).toBeLessThanOrEqual(right + 0.01);
    expect(item.size).toBeGreaterThanOrEqual(5);
  });
});

describe("acceptance: nothing changes a name behind the grower's back", () => {
  it("keeps an unknown name exactly as typed when the grower keeps it", () => {
    const typed = "mystery plant from a friend";
    const r = checkName(typed);
    expect(r.asTyped.line1).toBe(typed);
  });

  it("never applies a suggestion on its own: the queue only grows when an offer is chosen", () => {
    const r = checkName("hoya carnosa 'krimson queen'", { usualGenus: "Hoya" });
    expect(r.offers.length).toBeGreaterThan(0);
    expect(addEntry([], entryFromOffer("x", r.offers[0], "a"))).toHaveLength(1);
  });
});

describe("acceptance: the free build carries everything", () => {
  it("has no tier, plan, or purchase anywhere in the stored state", () => {
    expect(Object.keys(defaultState()).sort()).toEqual(["offsets", "queue", "settings", "version"]);
    expect(Object.keys(defaultState().settings).sort()).toEqual(["templateId", "usualGenus"]);
  });

  it("restores the queue and offsets after a restart and exports the same queue", async () => {
    const store = new MemoryStore();
    const state = defaultState();
    state.queue = addCuttingRun(queueOf(["hoya carnosa"]), { parentId: "p0", count: 2 });
    state.offsets = { avery5160: { xIn: 0.01, yIn: 0.02 } };
    await saveState(store, state);
    const back = await loadState(store);
    expect(back.queue).toEqual(state.queue);
    expect(queueToCsv(back.queue)).toBe(queueToCsv(state.queue));
    expect(back.offsets.avery5160).toEqual({ xIn: 0.01, yIn: 0.02 });
  });
});
