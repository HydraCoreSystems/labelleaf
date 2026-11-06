// Botanical name composer.
// Lifted from HydraCoreSystems/gm-commerce, lib/nursery/hoya-naming.ts.
//
// One scope change from the original: a blank genus no longer defaults to
// "Hoya". LabelLeaf serves growers of any plant, so the composer never invents
// a genus. A grower who wants a usual genus sets it in the app, and the name
// checker then offers it as a suggestion the grower accepts or ignores.

export type NamingFields = {
  genus?: string | null;
  species?: string | null;
  form_code?: string | null; // 'sp' | 'aff' | 'cf' | null
  hybrid?: boolean;
};

export type NameTypeFields = {
  cultivar?: string | null;
  name_type?: string | null; // 'Cultivar' | 'Form' | 'Descriptor' | null
};

function capitalizeWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function composeBotanicalLine1(fields: NamingFields): string {
  const genus = capitalizeWords(fields.genus ?? "");
  const species = fields.species?.trim().toLowerCase() || "";
  const formCode = (fields.form_code || "").trim().toLowerCase();
  const isHybrid = !!fields.hybrid;

  if (species) {
    let base = isHybrid ? `${genus} × ${species}` : `${genus} ${species}`;
    if (formCode === "aff") base += " aff.";
    if (formCode === "cf") base += " cf.";
    return base.trim();
  }

  if (formCode === "sp") return `${genus} sp.`.trim();

  return genus;
}

export function composeBotanicalLine2(fields: NameTypeFields): string {
  let cultivar = fields.cultivar?.trim() || "";
  if (!cultivar) return "";

  // Strip accidental outer quotes if already typed by user
  cultivar = cultivar.replace(/^['"‘“‘“]+|['"’”’”]+$/g, "").trim();
  if (!cultivar) return "";

  const nameType = (fields.name_type || "").trim().toLowerCase();
  if (nameType === "form" || nameType === "descriptor") return cultivar;

  // Cultivar: formatted with single quotes
  return `'${cultivar}'`;
}

/**
 * Display_Name is Botanical_Line1 + " " + Botanical_Line2 with straight quotes.
 */
export function composeDisplayName(line1: string, line2: string): string {
  const straighten = (s: string) => s.replace(/[‘’]/g, "'");
  return [straighten(line1), straighten(line2)]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}
