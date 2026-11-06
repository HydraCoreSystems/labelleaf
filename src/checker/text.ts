/** Small text helpers for the name checker. */

export function straightenQuotes(s: string): string {
  return s.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"');
}

export function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Lowercase, no accents, letters and digits only. Used to compare cultivar spellings. */
export function looseKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Edit distance with insert, delete, and replace. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** How far apart two names may be and still count as a likely typo. */
export function typoLimit(length: number): number {
  return length <= 5 ? 1 : 2;
}
