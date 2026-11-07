import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clampOffset, type Offsets, type TemplateId } from "../core/templates";
import {
  addCuttingRun,
  addEntry,
  moveEntry,
  removeEntry,
  updateEntry,
  type CuttingRunInput,
  type QueueEntry,
} from "../queue/queue";
import { defaultState, loadState, saveState, type PersistedState } from "../storage/storage";

interface Api {
  ready: boolean;
  state: PersistedState;
  add: (entry: QueueEntry) => void;
  update: (id: string, patch: Partial<Omit<QueueEntry, "id">>) => void;
  remove: (id: string) => void;
  move: (id: string, toIndex: number) => void;
  addRun: (input: CuttingRunInput) => void; // throws a plain message on bad input
  clearQueue: () => void;
  setTemplate: (id: TemplateId) => void;
  setUsualGenus: (genus: string) => void;
  setOffsets: (id: TemplateId, offsets: Offsets) => void;
  clearOffsets: (id: TemplateId) => void;
}

const Ctx = createContext<Api | null>(null);

/** Everything LabelLeaf remembers, loaded at start and saved on every change. */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(defaultState());
  const [ready, setReady] = useState(false);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    let live = true;
    loadState(AsyncStorage).then((s) => {
      if (!live) return;
      setState(s);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (ready) void saveState(AsyncStorage, state);
  }, [ready, state]);

  const patch = useCallback((fn: (s: PersistedState) => PersistedState) => setState((s) => fn(s)), []);

  const api = useMemo<Api>(
    () => ({
      ready,
      state,
      add: (entry) => patch((s) => ({ ...s, queue: addEntry(s.queue, entry) })),
      update: (id, p) => patch((s) => ({ ...s, queue: updateEntry(s.queue, id, p) })),
      remove: (id) => patch((s) => ({ ...s, queue: removeEntry(s.queue, id) })),
      move: (id, toIndex) => patch((s) => ({ ...s, queue: moveEntry(s.queue, id, toIndex) })),
      addRun: (input) => {
        // Run against the latest queue first so a bad input throws here, to the screen.
        const next = addCuttingRun(latest.current.queue, input);
        patch((s) => ({ ...s, queue: next }));
      },
      clearQueue: () => patch((s) => ({ ...s, queue: [] })),
      setTemplate: (id) => patch((s) => ({ ...s, settings: { ...s.settings, templateId: id } })),
      setUsualGenus: (genus) => patch((s) => ({ ...s, settings: { ...s.settings, usualGenus: genus } })),
      setOffsets: (id, o) =>
        patch((s) => ({ ...s, offsets: { ...s.offsets, [id]: { xIn: clampOffset(o.xIn), yIn: clampOffset(o.yIn) } } })),
      clearOffsets: (id) =>
        patch((s) => {
          const offsets = { ...s.offsets };
          delete offsets[id];
          return { ...s, offsets };
        }),
    }),
    [ready, state, patch]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppStateProvider is missing");
  return v;
}
