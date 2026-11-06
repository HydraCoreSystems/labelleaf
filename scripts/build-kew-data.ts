// Builds src/data/kew.json from Kew's wcvp_names.csv.
//
// Usage:
//   npx tsx scripts/build-kew-data.ts <path to wcvp_names.csv> <genera, comma separated> [version label] [output path]
//
// Example:
//   npx tsx scripts/build-kew-data.ts ~/data/wcvp_names.csv Hoya,Monstera,Philodendron v14
//
// The file is large, so it is streamed twice and never held in memory.

import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { WcvpAccumulator, parseHeader, parseRow } from "../src/data/wcvp";

async function pass(path: string, onRow: (row: Record<string, string>) => void): Promise<void> {
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  let header: { delimiter: string; columns: string[] } | null = null;
  for await (const line of rl) {
    if (!line) continue;
    if (!header) {
      header = parseHeader(line);
      continue;
    }
    onRow(parseRow(line, header.delimiter, header.columns));
  }
}

async function main() {
  const [file, genusList, version = "unspecified", outArg] = process.argv.slice(2);
  if (!file || !genusList) {
    console.error("Usage: tsx scripts/build-kew-data.ts <wcvp_names.csv> <Genus,Genus,...> [version]");
    process.exit(1);
  }
  const genera = genusList.split(",").map((g) => g.trim()).filter(Boolean);
  const acc = new WcvpAccumulator(genera);

  await pass(file, (row) => acc.addRow(row));
  if (acc.missingIds().size > 0) await pass(file, (row) => acc.addLookup(row));

  const data = acc.build("Kew World Checklist of Vascular Plants (WCVP)", version);
  const out = outArg ?? join(__dirname, "..", "src", "data", "kew.json");
  writeFileSync(out, JSON.stringify(data) + "\n");

  for (const g of Object.values(data.genera)) {
    console.log(`${g.name}: ${g.accepted.length} accepted, ${Object.keys(g.synonyms).length} synonyms`);
  }
  console.log(`Wrote ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
