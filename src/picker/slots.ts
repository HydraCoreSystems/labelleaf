import { chunkIntoSheets, LABELS_PER_SHEET } from "../core/labels";

export interface SheetPlan {
  index: number; // 0 based
  /** Slots left empty before the run starts. Only the first sheet has any. */
  blankSlots: number[];
  /** Slots this run fills on this sheet, in print order. */
  filledSlots: number[];
  /** Slots left empty after the run ends. Only the last sheet has any. */
  emptyAfter: number[];
}

export interface RunPlan {
  perSheet: number;
  startSlot: number;
  itemCount: number;
  sheets: SheetPlan[];
  spillsOntoSecondSheet: boolean;
  /** Plain words for the grower, or null when nothing needs saying. */
  warning: string | null;
}

const range = (from: number, to: number) => (to < from ? [] : Array.from({ length: to - from + 1 }, (_, i) => from + i));

/**
 * What a run will do to the sheet: which slots stay blank before the start
 * slot, which slots it fills and in what order, and whether it spills onto a
 * second sheet. Uses the lifted sheet chunking, so the picker preview and the
 * printed PDF can never disagree.
 */
export function planRun(startSlot: number, itemCount: number, perSheet: number = LABELS_PER_SHEET): RunPlan {
  const start = Math.max(1, Math.min(perSheet, Math.floor(startSlot) || 1));
  const chunks = chunkIntoSheets(Array.from({ length: itemCount }, (_, i) => i), start, perSheet);

  const sheets: SheetPlan[] = chunks.map((chunk, index) => {
    const firstFilled = chunk.blanks + 1;
    const lastFilled = chunk.blanks + chunk.items.length;
    const isLast = index === chunks.length - 1;
    return {
      index,
      blankSlots: range(1, chunk.blanks),
      filledSlots: range(firstFilled, lastFilled),
      emptyAfter: isLast ? range(lastFilled + 1, perSheet) : [],
    };
  });

  const spills = sheets.length > 1;
  const warning = spills
    ? `This run needs ${sheets.length} sheets. After slot ${perSheet} on the first sheet, printing continues at slot 1 on a fresh sheet.`
    : null;

  return { perSheet, startSlot: start, itemCount, sheets, spillsOntoSecondSheet: spills, warning };
}

export type SlotState = "blank" | "fill" | "empty";

/** State of every slot on one sheet of a plan, for drawing the picker grid. */
export function slotStates(plan: RunPlan, sheetIndex: number): SlotState[] {
  const sheet = plan.sheets[sheetIndex];
  const states: SlotState[] = Array.from({ length: plan.perSheet }, () => "empty" as SlotState);
  if (!sheet) return states;
  sheet.blankSlots.forEach((s) => (states[s - 1] = "blank"));
  sheet.filledSlots.forEach((s) => (states[s - 1] = "fill"));
  return states;
}
