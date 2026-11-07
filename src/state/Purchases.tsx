import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addLabels, remaining, type Counter } from "../core/counter";
import { isEntitled, type Entitlement } from "../core/entitlement";
import { cachedEntitlement, startIap } from "../services/iap";
import { keychain } from "../services/keychain";
import { loadCounterFast, loadCounterPlain, saveCounter } from "../services/purchaseStore";
import { mergeCounters } from "../core/counter";

interface Api {
  counter: Counter;
  entitlement: Entitlement;
  /** True while a subscription is active. The free count no longer applies. */
  unlimited: boolean;
  /** Labels left before the paywall. Infinity while unlimited. */
  left: number;
  /** Counts labels that were printed, and keeps the count on the phone. */
  countLabels: (n: number) => void;
  setEntitlement: (e: Entitlement) => void;
}

const Ctx = createContext<Api | null>(null);

/** The free label count and the paid state. Browsing and queue building never read either one. */
export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [counter, setCounter] = useState<Counter>(() => loadCounterFast(keychain));
  const [entitlement, setEnt] = useState<Entitlement>(() => cachedEntitlement());

  useEffect(() => startIap(setEnt), []);

  // The Keychain copy is read at once. The plain copy arrives a moment later and the larger count wins.
  useEffect(() => {
    let live = true;
    loadCounterPlain(AsyncStorage).then((plain) => live && setCounter((c) => mergeCounters(c, plain)));
    return () => {
      live = false;
    };
  }, []);

  const countLabels = useCallback((n: number) => {
    setCounter((c) => {
      const next = addLabels(c, n);
      void saveCounter(keychain, AsyncStorage, next);
      return next;
    });
  }, []);

  const unlimited = isEntitled(entitlement, Date.now());
  const api = useMemo<Api>(
    () => ({ counter, entitlement, unlimited, left: remaining(counter, unlimited), countLabels, setEntitlement: setEnt }),
    [counter, entitlement, unlimited, countLabels]
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePurchases(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error("PurchasesProvider is missing");
  return v;
}
