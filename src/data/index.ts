import cultivarJson from "./cultivars.json";
import kewJson from "./kew.json";
import type { CultivarData, KewData } from "../checker/types";

/** The data that ships in the app. Replace src/data/kew.json or cultivars.json to swap it. */
export const KEW: KewData = kewJson as KewData;
export const CULTIVARS: CultivarData = cultivarJson as CultivarData;

export function coveredGenera(data: { genera: Record<string, { name?: string; register?: string }> }): string[] {
  return Object.entries(data.genera).map(([key, g]) => (g as { name?: string }).name ?? key.charAt(0).toUpperCase() + key.slice(1));
}
