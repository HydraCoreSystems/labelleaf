// Structured name fields.
// Lifted from HydraCoreSystems/gm-commerce, lib/nursery/types.ts.
// Left behind on purpose: the trade name field (nothing prints it in version
// one), and every ledger, scan, and sales field from the Commerce Center.

export type Qualifier = "" | "aff." | "cf." | "sp.";

export type NameType = "Cultivar" | "Form" | "Descriptor";

export interface PlantName {
  genus: string;
  species: string;
  qualifier: Qualifier;
  cultivar: string;
  name_type: NameType;
  hybrid: boolean;
}

export const EMPTY_NAME: PlantName = {
  genus: "",
  species: "",
  qualifier: "",
  cultivar: "",
  name_type: "Cultivar",
  hybrid: false,
};

/**
 * The composer takes a form code ('sp' | 'aff' | 'cf'). The grower sees and
 * edits the qualifier ('sp.' | 'aff.' | 'cf.'). This is the one mapping
 * between them, so the two can never drift apart.
 */
export function formCodeFromQualifier(q: Qualifier): "sp" | "aff" | "cf" | null {
  if (q === "sp.") return "sp";
  if (q === "aff.") return "aff";
  if (q === "cf.") return "cf";
  return null;
}
