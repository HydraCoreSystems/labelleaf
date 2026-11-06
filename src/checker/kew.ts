import type { PlantName } from "../core/types";
import { editDistance, typoLimit } from "./text";
import type { KewData, KewGenus } from "./types";

export type KewFinding =
  | { kind: "no_data" } // no Kew data at all, or this genus is not covered
  | { kind: "known"; genus: KewGenus } // species is on Kew's accepted list
  | { kind: "synonym"; genus: KewGenus; replacement: { genus: string; species: string } }
  | { kind: "close"; genus: KewGenus; options: string[] } // likely typos
  | { kind: "unlisted"; genus: KewGenus }; // genus covered, species not found

function genusKey(genus: string): string {
  return genus.trim().toLowerCase();
}

export function kewGenusFor(data: KewData, genus: string): KewGenus | null {
  return data.genera[genusKey(genus)] ?? null;
}

/** Looks one typed name up in the bundled Kew data. Works fully offline. */
export function checkAgainstKew(data: KewData, name: PlantName): KewFinding {
  const genus = kewGenusFor(data, name.genus);
  const species = name.species.trim().toLowerCase();
  if (!genus || !species) return { kind: "no_data" };

  if (genus.accepted.includes(species)) return { kind: "known", genus };

  const syn = genus.synonyms[species];
  if (syn) {
    const parts = syn.trim().split(/\s+/);
    const replacement =
      parts.length >= 2 ? { genus: parts[0], species: parts[1].toLowerCase() } : { genus: genus.name, species: parts[0].toLowerCase() };
    return { kind: "synonym", genus, replacement };
  }

  const limit = typoLimit(species.length);
  const near = genus.accepted
    .map((candidate) => ({ candidate, d: editDistance(species, candidate) }))
    .filter((x) => x.d <= limit)
    .sort((a, b) => a.d - b.d || a.candidate.localeCompare(b.candidate))
    .slice(0, 3)
    .map((x) => x.candidate);
  if (near.length) return { kind: "close", genus, options: near };

  return { kind: "unlisted", genus };
}
