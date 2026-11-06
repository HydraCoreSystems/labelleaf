// Sheet chunking, start position parsing, and font size tiers.
// Lifted from HydraCoreSystems/gm-commerce, lib/nursery/labels.ts.
// Left behind on purpose: the QR code, scan address, and Instagram parts.
//
// Generalization: both launch templates hold 30 labels, so the original
// constant stays as the default. The optional perSheet argument lets a
// template with a different count reuse the same functions.

export const LABELS_PER_SHEET = 30;

export type LineSizeClass = "lg" | "md" | "sm" | "xs";

/**
 * Adaptive font-size tier for label text lines keyed to character length.
 * Calibrated against physical Brother / Avery sticker cell widths.
 */
export function sizeClassForLine(text: string | null | undefined): LineSizeClass {
  const len = (text ?? "").length;
  if (len <= 12) return "lg";
  if (len <= 18) return "md";
  if (len <= 26) return "sm";
  return "xs";
}

/**
 * Parses the sticker sheet start position (1 to 30) for printing on partial sheets.
 */
export function parseStartPosition(raw: string | undefined, perSheet: number = LABELS_PER_SHEET): number {
  const n = parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(perSheet, Math.max(1, n));
}

export type LabelSheetChunk<T> = { blanks: number; items: T[] };

/**
 * Chunks queued label items across physical sheets. Only the first sheet
 * includes leading blanks to account for used stickers.
 */
export function chunkIntoSheets<T>(
  items: T[],
  start: number,
  perSheet: number = LABELS_PER_SHEET
): LabelSheetChunk<T>[] {
  const sheets: LabelSheetChunk<T>[] = [];
  const remaining = items.slice();
  let blanks = Math.min(start - 1, perSheet - 1);

  while (remaining.length > 0) {
    const capacity = perSheet - blanks;
    sheets.push({ blanks, items: remaining.splice(0, capacity) });
    blanks = 0;
  }

  return sheets;
}
