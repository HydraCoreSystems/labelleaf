/**
 * Where a card lands when the grower drags it. `dy` is how far the finger
 * moved down (negative is up) and `rowHeight` is one card plus its gap.
 * The result always stays inside the list.
 */
export function dragTarget(index: number, dy: number, rowHeight: number, count: number): number {
  if (count <= 0 || rowHeight <= 0 || !Number.isFinite(dy)) return Math.max(0, index);
  const steps = Math.round(dy / rowHeight);
  return Math.max(0, Math.min(count - 1, index + steps));
}
