import { EMPTY_NAME, type PlantName, type Qualifier } from "../core/types";
import { collapseSpaces, straightenQuotes } from "./text";

const QUALIFIERS: Record<string, Qualifier> = {
  aff: "aff.",
  "aff.": "aff.",
  cf: "cf.",
  "cf.": "cf.",
  sp: "sp.",
  "sp.": "sp.",
};

const HYBRID_MARKS = new Set(["×", "x", "X"]);

/**
 * Turns what a grower typed into structured name fields.
 *
 * Rules, in order:
 * 1. A quoted part is the cultivar.
 * 2. A lone x or the multiplication sign marks a hybrid.
 * 3. aff, cf, and sp are qualifiers, with or without the dot.
 * 4. The first word is the genus.
 * 5. A second word that starts with a lowercase letter is the species.
 *    A second word that starts with a capital letter begins the cultivar,
 *    because species epithets are lowercase by convention.
 * 6. Any words left over make up the cultivar.
 *
 * This only reads. The grower still picks from the offers.
 */
export function parseTypedName(raw: string): PlantName {
  let text = collapseSpaces(straightenQuotes(raw ?? ""));
  const name: PlantName = { ...EMPTY_NAME };
  if (!text) return name;

  // 1. Quoted cultivar.
  const quoted = /'([^']+)'|"([^"]+)"/.exec(text);
  if (quoted) {
    name.cultivar = collapseSpaces(quoted[1] ?? quoted[2] ?? "");
    text = collapseSpaces(text.replace(quoted[0], " "));
  }

  // 2 and 3. Hybrid mark and qualifier, wherever they sit.
  const rest: string[] = [];
  for (const word of text.split(" ").filter(Boolean)) {
    const q = QUALIFIERS[word.toLowerCase()];
    if (q && !name.qualifier) {
      name.qualifier = q;
    } else if (HYBRID_MARKS.has(word) && rest.length >= 1) {
      name.hybrid = true;
    } else {
      rest.push(word);
    }
  }

  // 4. Genus.
  if (rest.length) name.genus = rest.shift() as string;

  // 5 and 6. Species, then cultivar words.
  if (rest.length) {
    const next = rest[0];
    const startsLower = next.charAt(0) === next.charAt(0).toLowerCase() && /[a-z]/i.test(next.charAt(0));
    if (startsLower) {
      name.species = (rest.shift() as string).toLowerCase();
    }
  }
  if (rest.length) {
    const leftover = rest.join(" ");
    name.cultivar = name.cultivar ? `${leftover} ${name.cultivar}` : leftover;
  }

  name.cultivar = capitalizeIfAllLowercase(name.cultivar);

  return name;
}

/**
 * Cultivar names carry capitals by convention. If the grower typed the whole
 * cultivar in lowercase, capitalize each word. Any capital the grower typed
 * is left alone, so names like "de Vries" survive.
 */
function capitalizeIfAllLowercase(cultivar: string): string {
  if (!cultivar || cultivar !== cultivar.toLowerCase()) return cultivar;
  return cultivar
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * The name exactly as typed, split into two lines. A quoted part starts line
 * two. With no quote, the whole text is line one. Never changes a letter.
 */
export function splitAsTyped(raw: string): { line1: string; line2: string } {
  const text = collapseSpaces(raw ?? "");
  const m = /['"‘“]/.exec(text);
  if (!m || m.index === 0) return { line1: text, line2: "" };
  return { line1: text.slice(0, m.index).trim(), line2: text.slice(m.index).trim() };
}
