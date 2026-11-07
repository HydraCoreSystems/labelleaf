import { generatePropagationRecords, sequenceMark } from "../core/propagation";
import type { PlantName } from "../core/types";
import type { Offer } from "../checker/types";

/**
 * One label in the queue. A plant entry is one label. A cutting entry is one
 * label for one cutting, with its own mark in the style of C08.
 */
export interface QueueEntry {
  id: string;
  typed: string; // exactly what the grower typed
  line1: string;
  line2: string;
  name: PlantName | null; // structured fields when the entry came from an offer
  source: "offer" | "typed";
  kind: "plant" | "cutting";
  mark?: string; // cutting entries only, for example "C08"
  parentId?: string; // cutting entries only
}

export const MAX_RUN = 99; // the mark has two digits

let counter = 0;
export function newEntryId(): string {
  counter += 1;
  return `p${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function entryFromOffer(typed: string, offer: Offer, id: string = newEntryId()): QueueEntry {
  return { id, typed, line1: offer.line1, line2: offer.line2, name: offer.name, source: "offer", kind: "plant" };
}

/** The name goes in exactly as typed. No layer knew it, or the grower chose to keep it. */
export function entryFromTyped(
  typed: string,
  asTyped: { line1: string; line2: string },
  id: string = newEntryId()
): QueueEntry {
  return { id, typed, line1: asTyped.line1, line2: asTyped.line2, name: null, source: "typed", kind: "plant" };
}

export function addEntry(queue: QueueEntry[], entry: QueueEntry): QueueEntry[] {
  return [...queue, entry];
}

export function updateEntry(queue: QueueEntry[], id: string, patch: Partial<Omit<QueueEntry, "id">>): QueueEntry[] {
  return queue.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

export function removeEntry(queue: QueueEntry[], id: string): QueueEntry[] {
  return queue.filter((e) => e.id !== id);
}

/** Moves one entry to a new position. Positions are clamped to the list. */
export function moveEntry(queue: QueueEntry[], id: string, toIndex: number): QueueEntry[] {
  const from = queue.findIndex((e) => e.id === id);
  if (from < 0) return queue;
  const to = Math.max(0, Math.min(queue.length - 1, toIndex));
  if (to === from) return queue;
  const next = queue.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** The next free sequence number for a plant's cuttings. */
export function nextCuttingSeq(queue: QueueEntry[], parentId: string): number {
  let highest = 0;
  for (const e of queue) {
    if (e.kind === "cutting" && e.parentId === parentId && e.mark) {
      const n = parseInt(e.mark.slice(1), 10);
      if (Number.isFinite(n)) highest = Math.max(highest, n);
    }
  }
  return highest + 1;
}

export interface CuttingRunInput {
  parentId: string;
  count: number;
  startSeq?: number; // defaults to the next free number for this plant
  dateTaken?: string;
}

/**
 * Adds one cutting label per cutting, straight after the plant and any
 * cuttings it already has. Goes through the lifted propagation logic, so the
 * quantity invariant holds: 10 cuttings make exactly 10 labels.
 */
export function addCuttingRun(queue: QueueEntry[], input: CuttingRunInput): QueueEntry[] {
  const parentIndex = queue.findIndex((e) => e.id === input.parentId);
  if (parentIndex < 0) throw new Error("Plant not found");
  const parent = queue[parentIndex];
  if (parent.kind !== "plant") throw new Error("A cutting run starts from a plant entry");
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > MAX_RUN) {
    throw new Error(`Enter a number from 1 to ${MAX_RUN}`);
  }
  const startSeq = input.startSeq ?? nextCuttingSeq(queue, parent.id);
  if (!Number.isInteger(startSeq) || startSeq < 1 || startSeq + input.count - 1 > MAX_RUN) {
    throw new Error(`Cutting marks run from C01 to C${MAX_RUN}`);
  }

  const taken = new Set(queue.filter((e) => e.parentId === parent.id && e.mark).map((e) => e.mark));
  const records = generatePropagationRecords({
    donor: {
      donor_id: parent.id,
      display_name: [parent.line1, parent.line2].filter(Boolean).join(" "),
      botanical_line1: parent.line1,
      botanical_line2: parent.line2,
    },
    startSeq,
    outputCount: input.count,
    dateTaken: input.dateTaken,
  });
  const created: QueueEntry[] = [];
  for (const r of records) {
    const mark = sequenceMark(r.propagation_id);
    if (taken.has(mark)) throw new Error(`${mark} is already in the queue for this plant`);
    created.push({
      id: r.propagation_id,
      typed: parent.typed,
      line1: r.label_line1 ?? "",
      line2: r.label_line2 ?? "",
      name: parent.name,
      source: parent.source,
      kind: "cutting",
      mark,
      parentId: parent.id,
    });
  }

  let insertAt = parentIndex + 1;
  while (insertAt < queue.length && queue[insertAt].parentId === parent.id) insertAt += 1;
  return [...queue.slice(0, insertAt), ...created, ...queue.slice(insertAt)];
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The queue as a spreadsheet file (CSV), in print order. */
export function queueToCsv(queue: QueueEntry[]): string {
  const rows = [["Position", "Line 1", "Line 2", "Mark", "As typed"]];
  queue.forEach((e, i) => rows.push([String(i + 1), e.line1, e.line2, e.mark ?? "", e.typed]));
  return rows.map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/** The part of an entry that gets printed on its label. */
export function toLabelContent(e: QueueEntry): { line1: string; line2: string; mark?: string } {
  return { line1: e.line1, line2: e.line2, mark: e.mark };
}
