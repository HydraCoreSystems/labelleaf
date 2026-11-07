import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The screens should pull their words from copy.ts. This reads the screen files
// and fails if human text with a dash sits in one of them anyway. Style values
// like "flex-start" have no spaces, so they are not mistaken for sentences.
const DASH = /[-‐-―−]/;
const DIRS = [join(__dirname, "..", "app"), __dirname];

function files(): string[] {
  return DIRS.flatMap((d) => readdirSync(d).filter((f) => /\.tsx$/.test(f)).map((f) => join(d, f)));
}

describe("screen files carry no dashes in visible text", () => {
  it("finds the screens", () => {
    expect(files().length).toBeGreaterThanOrEqual(7);
  });

  it("has no quoted sentence with a dash", () => {
    const offenders: string[] = [];
    for (const f of files()) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/(["'`])((?:\\.|(?!\1).)*?)\1/g)) {
        const s = m[2];
        if (/\s/.test(s) && /[A-Za-z]/.test(s) && DASH.test(s) && !s.startsWith("import") && !/\$\{/.test(s)) {
          offenders.push(`${f}: ${s}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has no JSX text with a dash", () => {
    const offenders: string[] = [];
    for (const f of files()) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g)) {
        if (DASH.test(m[1]) && !/=>/.test(m[1])) offenders.push(`${f}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
