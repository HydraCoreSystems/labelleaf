import type { PlantName } from "../core/types";

/**
 * Kew WCVP data, trimmed to the genera the app covers.
 * Built from wcvp_names.csv by scripts/build-kew-data.ts into src/data/kew.json.
 * Swapping that one file swaps the data. Nothing else reads the raw CSV.
 */
export interface KewGenus {
  name: string; // genus as Kew spells it, for example "Hoya"
  accepted: string[]; // accepted species epithets, lowercase
  hybrids: string[]; // the accepted epithets that are hybrids
  /** synonym epithet to accepted name. A value with a space is "Genus epithet" in another genus. */
  synonyms: Record<string, string>;
  /**
   * Epithets Kew lists but that have no single accepted replacement to offer:
   * unplaced names, misapplied names, and names whose accepted form is below
   * species rank or outside the covered genera. The checker treats these as
   * known, so it does not claim Kew has never heard of them.
   */
  listed?: string[];
}

export interface KewData {
  source: string | null;
  version: string | null;
  genera: Record<string, KewGenus>; // key is the lowercase genus
}

/** Cultivar registers, one per genus where a register exists. */
export interface CultivarRegisterGenus {
  register: string; // name of the register, shown to the grower
  names: string[]; // registered cultivar names, in their registered spelling
}

export interface CultivarData {
  source: string | null;
  version: string | null;
  genera: Record<string, CultivarRegisterGenus>; // key is the lowercase genus
}

export type OfferLayer = "format" | "kew" | "cultivar" | "usual";

export interface Offer {
  id: string;
  layer: OfferLayer;
  /** Structured fields, or null for a cross formula the fields cannot hold. */
  name: PlantName | null;
  line1: string;
  line2: string;
  /** Plain words telling the grower why this is offered. */
  reason: string;
}

export interface CheckResult {
  /** Format offer first. The grower always picks. Nothing applies on its own. */
  offers: Offer[];
  /** Plain notes, for example that Kew does not list a name. */
  notes: string[];
  /** The name exactly as the grower typed it, split into two lines. */
  asTyped: { line1: string; line2: string };
}

export interface CheckOptions {
  kew?: KewData;
  cultivars?: CultivarData;
  /** The grower's usual genus from settings. Offered, never applied. */
  usualGenus?: string;
}
