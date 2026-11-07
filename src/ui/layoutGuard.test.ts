import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (...p: string[]) => readFileSync(join(__dirname, "..", ...p), "utf8");

// Android does not re-measure text when a custom font arrives late, so the last
// letters clip. These guards keep the font gate and the shrinkable layout in place.
describe("text cannot clip", () => {
  const layout = read("app", "_layout.tsx");
  it("holds the splash until fonts load, with a cap", () => {
    expect(layout).toContain("preventAutoHideAsync");
    expect(layout).toContain("hideAsync");
    expect(layout).toMatch(/FONT_WAIT_MS\s*=\s*\d+/);
  });
  it("rebuilds the navigator when the fonts arrive", () => {
    expect(layout).toMatch(/<Stack\s+key=\{loaded/);
  });
  it("lets the queue header text shrink", () => {
    const q = read("app", "index.tsx");
    expect(q).toMatch(/brand:[^\n]*flexShrink: 1/);
  });
  it("uses minimum sizes, not fixed heights, for pills, chips and segments", () => {
    const c = read("ui", "components.tsx");
    expect(c).toMatch(/pill:\s*\{\s*minHeight/);
    expect(c).not.toMatch(/\bheight: (24|36|48),/);
  });
});
