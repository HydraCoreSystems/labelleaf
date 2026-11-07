/**
 * The free label count. Thirty labels are free, counted on the phone. After that an active subscription
 * lifts the count and changes nothing else: the free app is the whole app.
 *
 * WHAT COUNTS. A printed label is one label cell filled in a run that the system print dialog accepted.
 * - The count goes up once, after the print dialog finishes without being cancelled or failing.
 * - A run of 12 labels counts 12, however many sheets it spans.
 * - Blank slots before the start slot do not count.
 * - A cancelled print, a failed print, and a sheet that never built do not count.
 * - The calibration test sheet is setup, not labels, and never counts and is never blocked.
 * - Printing the same label again counts again. Each printed label is one.
 */

export const FREE_LABELS = 30;

export interface Counter {
  used: number;
}

export const EMPTY_COUNTER: Counter = { used: 0 };

export function readCounter(raw: unknown): Counter {
  const used = (raw as { used?: unknown } | null)?.used;
  return typeof used === "number" && Number.isFinite(used) && used >= 0 ? { used: Math.floor(used) } : EMPTY_COUNTER;
}

/** Labels left before the paywall. Infinity while a subscription is active. */
export function remaining(c: Counter, unlimited: boolean): number {
  return unlimited ? Infinity : Math.max(0, FREE_LABELS - c.used);
}

export const addLabels = (c: Counter, n: number): Counter => ({ used: c.used + Math.max(0, Math.floor(n)) });

/** The labels one run prints: one per queue entry in the run. Blank slots are not labels. */
export const labelsInRun = (entryCount: number): number => Math.max(0, Math.floor(entryCount));

/** Two copies of the count, the Keychain one and the plain one. The larger wins, so losing one never lowers it. */
export const mergeCounters = (a: Counter, b: Counter): Counter => ({ used: Math.max(a.used, b.used) });

export type PrintGate = { allowed: true } | { allowed: false; left: number; needed: number };

/**
 * The gate on the print action. A run prints whole or not at all: it must fit in what is left.
 * An active subscription always passes. Nothing else in the app calls this.
 */
export function printGate(c: Counter, unlimited: boolean, labels: number): PrintGate {
  if (unlimited) return { allowed: true };
  const left = remaining(c, false);
  return labels <= left ? { allowed: true } : { allowed: false, left, needed: labels };
}
