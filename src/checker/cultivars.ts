import { editDistance, looseKey } from "./text";
import type { CultivarData } from "./types";

export type CultivarFinding =
  | { kind: "no_register" } // no register for this genus, or no data at all
  | { kind: "registered"; register: string } // already spelled as registered
  | { kind: "respell"; register: string; registered: string } // registered spelling differs
  | { kind: "unlisted"; register: string }; // register exists, name not in it

/** Looks a cultivar name up in the register for its genus. Works offline. */
export function checkAgainstRegister(data: CultivarData, genus: string, cultivar: string): CultivarFinding {
  const entry = data.genera[genus.trim().toLowerCase()];
  const typed = cultivar.trim();
  if (!entry || !typed) return { kind: "no_register" };

  if (entry.names.includes(typed)) return { kind: "registered", register: entry.register };

  const key = looseKey(typed);
  if (!key) return { kind: "unlisted", register: entry.register };

  // Same letters and digits with different case, spacing, or marks.
  const same = entry.names.find((n) => looseKey(n) === key);
  if (same) return { kind: "respell", register: entry.register, registered: same };

  // One slip away, on names long enough that one slip is a safe guess.
  if (key.length >= 6) {
    const near = entry.names.filter((n) => editDistance(looseKey(n), key) === 1);
    if (near.length === 1) return { kind: "respell", register: entry.register, registered: near[0] };
  }

  return { kind: "unlisted", register: entry.register };
}
