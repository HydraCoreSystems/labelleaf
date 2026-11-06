// Turns rows of Kew's wcvp_names.csv into the trimmed KewData the app bundles.
// Pure code with no file access, so the same logic runs in tests and in the
// build script. The script reads the real file twice: pass one collects rows
// for the covered genera, pass two fetches any accepted names that live in a
// genus the app does not cover.
//
// Columns are found by header name, never by position, and a missing column
// stops the import with a clear message instead of producing bad data.

import type { KewData, KewGenus } from "../checker/types";

export const REQUIRED_COLUMNS = [
  "plant_name_id",
  "taxon_rank",
  "taxon_status",
  "genus",
  "species",
  "genus_hybrid",
  "species_hybrid",
  "accepted_plant_name_id",
] as const;

const SYNONYM_STATUSES = new Set(["Synonym", "Orthographic", "Illegitimate", "Invalid"]);

export type WcvpRow = Record<string, string>;

/** Picks the delimiter from the header line. Kew's file uses a pipe. */
export function detectDelimiter(headerLine: string): string {
  const candidates = ["|", "\t", ","];
  let best = candidates[0];
  let bestCount = -1;
  for (const c of candidates) {
    const n = headerLine.split(c).length;
    if (n > bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best;
}

export function parseHeader(headerLine: string): { delimiter: string; columns: string[] } {
  const delimiter = detectDelimiter(headerLine);
  const columns = headerLine.replace(/^﻿/, "").split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length) {
    throw new Error(`wcvp_names file is missing columns: ${missing.join(", ")}`);
  }
  return { delimiter, columns };
}

export function parseRow(line: string, delimiter: string, columns: string[]): WcvpRow {
  const cells = line.split(delimiter);
  const row: WcvpRow = {};
  for (let i = 0; i < columns.length; i++) row[columns[i]] = (cells[i] ?? "").trim().replace(/^"|"$/g, "");
  return row;
}

interface Stored {
  id: string;
  status: string;
  genus: string;
  species: string;
  hybrid: boolean;
  acceptedId: string;
}

export class WcvpAccumulator {
  private covered: Map<string, string>; // lowercase genus to display genus
  private rows = new Map<string, Stored>();
  private wanted = new Set<string>();

  constructor(genera: string[]) {
    this.covered = new Map(genera.map((g) => [g.trim().toLowerCase(), g.trim()]));
  }

  private store(row: WcvpRow): void {
    this.rows.set(row.plant_name_id, {
      id: row.plant_name_id,
      status: row.taxon_status,
      genus: row.genus,
      species: row.species.toLowerCase(),
      hybrid: row.species_hybrid === "×" || row.species_hybrid === "x" || row.genus_hybrid === "×",
      acceptedId: row.accepted_plant_name_id,
    });
  }

  /** Pass one. Keeps species rank rows of the covered genera. */
  addRow(row: WcvpRow): void {
    if (row.taxon_rank !== "Species" || !row.species) return;
    if (!this.covered.has(row.genus.toLowerCase())) return;
    this.store(row);
    if (SYNONYM_STATUSES.has(row.taxon_status) && row.accepted_plant_name_id) {
      this.wanted.add(row.accepted_plant_name_id);
    }
  }

  /** Ids of accepted names still needed after pass one. */
  missingIds(): Set<string> {
    return new Set([...this.wanted].filter((id) => !this.rows.has(id)));
  }

  /** Pass two. Keeps only the rows pass one asked for. */
  addLookup(row: WcvpRow): void {
    if (row.taxon_rank !== "Species" || !row.species) return;
    if (!this.wanted.has(row.plant_name_id) || this.rows.has(row.plant_name_id)) return;
    this.store(row);
  }

  build(source: string, version: string): KewData {
    const genera: Record<string, KewGenus> = {};
    for (const [key, display] of this.covered) {
      genera[key] = { name: display, accepted: [], hybrids: [], synonyms: {} };
    }

    for (const r of this.rows.values()) {
      const key = r.genus.toLowerCase();
      const g = genera[key];
      if (!g) continue; // fetched only to resolve a synonym
      if (r.status === "Accepted") {
        if (!g.accepted.includes(r.species)) g.accepted.push(r.species);
        if (r.hybrid && !g.hybrids.includes(r.species)) g.hybrids.push(r.species);
      } else if (SYNONYM_STATUSES.has(r.status)) {
        const target = this.rows.get(r.acceptedId);
        if (!target || target.status !== "Accepted") continue;
        const sameGenus = target.genus.toLowerCase() === key;
        g.synonyms[r.species] = sameGenus ? target.species : `${target.genus} ${target.species}`;
      }
    }

    for (const g of Object.values(genera)) {
      g.accepted.sort();
      g.hybrids.sort();
      g.synonyms = Object.fromEntries(Object.entries(g.synonyms).sort(([a], [b]) => a.localeCompare(b)));
    }
    return { source, version, genera };
  }
}
