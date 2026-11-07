import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");

// The paywall belongs to the print action alone. These guards read the source so a later change
// cannot quietly put it in front of browsing, queue building or the calibration test sheet.
describe("where the paywall can open", () => {
  it("opens from the print screen only, through the gate, before any PDF is built", () => {
    const users = readdirSync(join(root, "app"))
      .filter((f) => /\.tsx$/.test(f))
      .filter((f) => read("app", f).includes('"/paywall"'));
    expect(users).toEqual(["print.tsx"]);

    const print = read("app", "print.tsx");
    const gate = print.indexOf("printGate(");
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(print.indexOf("buildLabelPdf({"));
    expect(gate).toBeLessThan(print.indexOf("await printPdf("));
  });

  it("counts labels only after the print dialog finished", () => {
    const print = read("app", "print.tsx");
    expect(print.indexOf("countLabels(labels)")).toBeGreaterThan(print.indexOf("await printPdf("));
  });

  it("never gates or counts the calibration test sheet, or the queue, add and cuttings screens", () => {
    for (const f of ["calibrate.tsx", "index.tsx", "add.tsx", "cuttings.tsx"]) {
      const src = read("app", f);
      expect(src).not.toContain("printGate");
      expect(src).not.toContain("countLabels");
      expect(src).not.toContain("paywall");
    }
  });

  it("holds the product ids in one file only", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) && read(p.slice(root.length + 1)).includes("com.gatheringmoss.labelleaf.")) hits.push(p.slice(root.length + 1));
      }
    };
    walk(root);
    expect(hits).toEqual([join("core", "entitlement.ts")]);
  });

  it("never grants an entitlement without the store: the only writers are the store answers", () => {
    const iap = read("services", "iap.ts");
    expect((iap.match(/saveEntitlement\(/g) ?? []).length).toBe(1);
    expect(iap).toContain("getActiveSubscriptions");
    expect(read("state", "Purchases.tsx")).not.toMatch(/__DEV__/);
  });
});
