import { composeBotanicalLine1, composeBotanicalLine2, composeDisplayName } from "../core/naming";
import { formCodeFromQualifier, type PlantName } from "../core/types";
import { checkAgainstRegister } from "./cultivars";
import { checkAgainstKew } from "./kew";
import { crossFormulaLines, parseTypedName, splitAsTyped } from "./parse";
import { collapseSpaces, straightenQuotes } from "./text";
import type { CheckOptions, CheckResult, Offer, OfferLayer } from "./types";

/** The two label lines for structured name fields, through the lifted composer. */
export function composeLines(name: PlantName): { line1: string; line2: string } {
  return {
    line1: composeBotanicalLine1({
      genus: name.genus,
      species: name.species,
      form_code: formCodeFromQualifier(name.qualifier),
      hybrid: name.hybrid,
    }),
    line2: composeBotanicalLine2({ cultivar: name.cultivar, name_type: name.name_type }),
  };
}

function makeOffer(layer: OfferLayer, name: PlantName, reason: string): Offer {
  const { line1, line2 } = composeLines(name);
  return { id: `${layer}:${composeDisplayName(line1, line2)}`, layer, name, line1, line2, reason };
}

/**
 * Three layers, in this order: format, Kew, cultivar register.
 *
 * The result is a list of suggestions. Nothing here changes a name. The
 * grower taps one offer or keeps the name as typed. With no Kew data and no
 * register data, the only offer is the format offer.
 */
export function checkName(typed: string, options: CheckOptions = {}): CheckResult {
  const asTyped = splitAsTyped(typed);
  const parsed = parseTypedName(typed);
  const offers: Offer[] = [];
  const notes: string[] = [];

  if (!collapseSpaces(typed)) return { offers, notes, asTyped };

  // A cross between two species cannot be held in the name fields, so it gets
  // its own format offer. Kew and register checks do not cover crosses yet.
  const cross = crossFormulaLines(typed);
  if (cross) {
    return {
      offers: [
        {
          id: `format:${composeDisplayName(cross.line1, cross.line2)}`,
          layer: "format",
          name: null,
          line1: cross.line1,
          line2: cross.line2,
          reason: "Genus capitalized and the cross written with the multiplication sign. Every word is as you typed it.",
        },
      ],
      notes: ["This looks like a cross between two species. Kew checking does not cover crosses yet."],
      asTyped,
    };
  }

  // Layer 1: format. Always first.
  const formatted = makeOffer("format", parsed, "");
  const typedDisplay = composeDisplayName(asTyped.line1, asTyped.line2);
  const sameAsTyped = straightenQuotes(typedDisplay) === composeDisplayName(formatted.line1, formatted.line2);
  offers.push({
    ...formatted,
    reason: sameAsTyped ? "This follows botanical form." : "Capital letters, quotes, and marks set to botanical form.",
  });

  // Layer 3 first, so Kew offers can carry the registered spelling too.
  let cultivar = parsed.cultivar;
  let registerNote = "";
  if (options.cultivars && parsed.genus && parsed.cultivar && parsed.name_type === "Cultivar") {
    const found = checkAgainstRegister(options.cultivars, parsed.genus, parsed.cultivar);
    if (found.kind === "respell") {
      cultivar = found.registered;
      registerNote = `Registered spelling in the ${found.register}.`;
    } else if (found.kind === "unlisted") {
      notes.push(`The ${found.register} does not list ${parsed.cultivar}. The name stays as typed.`);
    }
  }

  // Layer 2: Kew.
  if (options.kew && parsed.species) {
    const finding = checkAgainstKew(options.kew, parsed);
    if (finding.kind === "synonym") {
      const { genus, species } = finding.replacement;
      const isHybrid = finding.genus.hybrids.includes(species);
      offers.push(
        makeOffer(
          "kew",
          { ...parsed, genus, species, cultivar, hybrid: parsed.hybrid || isHybrid },
          `Kew lists ${parsed.species} as another name for ${genus} ${species}.`
        )
      );
    } else if (finding.kind === "close") {
      for (const species of finding.options) {
        const isHybrid = finding.genus.hybrids.includes(species);
        offers.push(
          makeOffer(
            "kew",
            { ...parsed, genus: finding.genus.name, species, cultivar, hybrid: parsed.hybrid || isHybrid },
            `Kew lists ${finding.genus.name} ${species}. Did you mean that?`
          )
        );
      }
    } else if (finding.kind === "unlisted") {
      notes.push(`Kew data for ${finding.genus.name} does not list ${parsed.species}. The name stays as typed.`);
    }
  }

  // Layer 3 offer on its own, when the species needs no Kew change.
  if (cultivar !== parsed.cultivar && !offers.some((o) => o.layer === "kew" && o.line2 === composeLines({ ...parsed, cultivar }).line2)) {
    offers.push(makeOffer("cultivar", { ...parsed, cultivar }, registerNote));
  }

  // The grower's usual genus. A suggestion for a lone lowercase word, never applied.
  const usual = options.usualGenus?.trim();
  const words = collapseSpaces(typed).split(" ");
  if (usual && words.length === 1 && /^[a-z]/.test(words[0]) && !parsed.species) {
    offers.push(
      makeOffer("usual", { ...parsed, genus: usual, species: words[0].toLowerCase() }, `Uses your usual genus, ${usual}.`)
    );
  }

  // Drop repeats, keep first.
  const seen = new Set<string>();
  const unique = offers.filter((o) => (seen.has(o.id) ? false : (seen.add(o.id), true)));
  return { offers: unique, notes, asTyped };
}
