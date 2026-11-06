import { TEMPLATES, clampOffset, firstPrintableTemplate, type Offsets, type TemplateId } from "../core/templates";
import type { QueueEntry } from "../queue/queue";

/** The small slice of storage the app needs. AsyncStorage fits it as is. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
}

export interface AppSettings {
  templateId: TemplateId;
  usualGenus: string;
}

/**
 * Everything LabelLeaf remembers. It lives on the phone only. There is no
 * account, so "per grower" means per install, and offsets are kept per template.
 */
export interface PersistedState {
  version: 1;
  queue: QueueEntry[];
  settings: AppSettings;
  offsets: Partial<Record<TemplateId, Offsets>>;
}

export const STATE_KEY = "labelleaf.state.v1";

export function defaultState(): PersistedState {
  return { version: 1, queue: [], settings: { templateId: firstPrintableTemplate(), usualGenus: "" }, offsets: {} };
}

function isEntry(v: unknown): v is QueueEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.typed === "string" &&
    typeof e.line1 === "string" &&
    typeof e.line2 === "string" &&
    (e.kind === "plant" || e.kind === "cutting") &&
    (e.source === "offer" || e.source === "typed")
  );
}

/** Reads saved state. Anything damaged falls back to its default instead of crashing the app. */
export function sanitizeState(raw: unknown): PersistedState {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const queue = Array.isArray(r.queue) ? (r.queue.filter(isEntry) as QueueEntry[]) : [];

  const s = (r.settings ?? {}) as Record<string, unknown>;
  const templateId =
    typeof s.templateId === "string" && s.templateId in TEMPLATES ? (s.templateId as TemplateId) : base.settings.templateId;
  const usualGenus = typeof s.usualGenus === "string" ? s.usualGenus : "";

  const offsets: PersistedState["offsets"] = {};
  const o = (r.offsets ?? {}) as Record<string, unknown>;
  for (const id of Object.keys(TEMPLATES) as TemplateId[]) {
    const v = o[id] as Record<string, unknown> | undefined;
    if (v && typeof v.xIn === "number" && typeof v.yIn === "number" && Number.isFinite(v.xIn) && Number.isFinite(v.yIn)) {
      offsets[id] = { xIn: clampOffset(v.xIn), yIn: clampOffset(v.yIn) };
    }
  }

  return { version: 1, queue, settings: { templateId, usualGenus }, offsets };
}

export async function loadState(store: KeyValueStore): Promise<PersistedState> {
  try {
    const text = await store.getItem(STATE_KEY);
    if (!text) return defaultState();
    return sanitizeState(JSON.parse(text));
  } catch {
    return defaultState();
  }
}

export async function saveState(store: KeyValueStore, state: PersistedState): Promise<void> {
  await store.setItem(STATE_KEY, JSON.stringify(state));
}
