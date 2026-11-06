import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MemoryStore,
  STATE_KEY,
  defaultState,
  loadState,
  sanitizeState,
  saveState,
  type KeyValueStore,
} from "./storage";
import { TEMPLATES, firstPrintableTemplate, resolveOffsets } from "../core/templates";

/** A store backed by a real file, so a test can close and reopen it like the app does. */
class FileStore implements KeyValueStore {
  constructor(private path: string) {}
  async getItem(key: string) {
    if (!existsSync(this.path)) return null;
    const all = JSON.parse(readFileSync(this.path, "utf8"));
    return key in all ? all[key] : null;
  }
  async setItem(key: string, value: string) {
    const all = existsSync(this.path) ? JSON.parse(readFileSync(this.path, "utf8")) : {};
    all[key] = value;
    writeFileSync(this.path, JSON.stringify(all));
  }
  async removeItem(key: string) {
    const all = existsSync(this.path) ? JSON.parse(readFileSync(this.path, "utf8")) : {};
    delete all[key];
    writeFileSync(this.path, JSON.stringify(all));
  }
}

describe("saving and loading", () => {
  it("starts empty on the first template that can print, with no usual genus", async () => {
    const s = await loadState(new MemoryStore());
    expect(s).toEqual(defaultState());
    expect(s.settings).toEqual({ templateId: firstPrintableTemplate(), usualGenus: "" });
    expect(s.queue).toEqual([]);
  });

  it("keeps the queue, settings, and offsets after the app closes and opens again", async () => {
    const dir = mkdtempSync(join(tmpdir(), "labelleaf-"));
    try {
      const path = join(dir, "store.json");

      // Session one: set things, then the app closes.
      const first = new FileStore(path);
      const state = defaultState();
      state.settings = { templateId: "avery5160", usualGenus: "Hoya" };
      state.offsets = { avery5160: { xIn: -0.02, yIn: 0.11 } };
      state.queue = [
        { id: "a", typed: "t", line1: "Hoya carnosa", line2: "'Krimson Queen'", name: null, source: "typed", kind: "plant" },
        { id: "a-C08", typed: "t", line1: "Hoya carnosa", line2: "'Krimson Queen'", name: null, source: "typed", kind: "cutting", mark: "C08", parentId: "a" },
      ];
      await saveState(first, state);

      // Session two: a brand new store object over the same file.
      const second = new FileStore(path);
      const loaded = await loadState(second);
      expect(loaded).toEqual(state);
      expect(resolveOffsets(TEMPLATES.avery5160, loaded.offsets.avery5160)).toEqual({ xIn: -0.02, yIn: 0.11 });
      expect(loaded.queue[1].mark).toBe("C08");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recovers from damaged saved data instead of failing", async () => {
    const store = new MemoryStore();
    await store.setItem(STATE_KEY, "{not json");
    expect(await loadState(store)).toEqual(defaultState());
  });
});

describe("sanitizeState", () => {
  it("drops queue entries that are not shaped right and keeps the good ones", () => {
    const s = sanitizeState({
      queue: [
        { id: "a", typed: "t", line1: "L1", line2: "", kind: "plant", source: "typed", name: null },
        { id: 5 },
        "junk",
        null,
      ],
    });
    expect(s.queue.map((e) => e.id)).toEqual(["a"]);
  });

  it("falls back to the first printable template for an unknown template id", () => {
    expect(sanitizeState({ settings: { templateId: "nope" } }).settings.templateId).toBe(firstPrintableTemplate());
  });

  it("ignores offsets that are not numbers and clamps ones that are too large", () => {
    const s = sanitizeState({ offsets: { avery5160: { xIn: "a", yIn: 1 }, avery8257: { xIn: 5, yIn: -5 } } });
    expect(s.offsets.avery5160).toBeUndefined();
    expect(s.offsets.avery8257).toEqual({ xIn: 0.25, yIn: -0.25 });
  });

  it("handles non object input", () => {
    expect(sanitizeState(null)).toEqual(defaultState());
    expect(sanitizeState(42)).toEqual(defaultState());
  });
});
