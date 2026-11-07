import { EMPTY_COUNTER, mergeCounters, readCounter, type Counter } from "../core/counter";
import { NO_ENTITLEMENT, readEntitlement, type Entitlement } from "../core/entitlement";
import type { KeyValueStore } from "../storage/storage";

export const COUNTER_KEY = "labelleaf.labels.v1";
export const ENTITLEMENT_KEY = "labelleaf.entitlement.v1";

/**
 * The part of the iPhone Keychain this app uses. It survives deleting and reinstalling the app, so the
 * free count cannot be reset by a reinstall. It stays on this phone and is never sent anywhere.
 */
export interface Keychain {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

function parse(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The count as the Keychain has it, read at once. Zero when it cannot be read. */
export function loadCounterFast(chain: Keychain): Counter {
  try {
    return readCounter(parse(chain.get(COUNTER_KEY)));
  } catch {
    return EMPTY_COUNTER;
  }
}

/** The count from the phone's plain storage, the second copy. */
export async function loadCounterPlain(plain: KeyValueStore): Promise<Counter> {
  try {
    return readCounter(parse(await plain.getItem(COUNTER_KEY)));
  } catch {
    return EMPTY_COUNTER;
  }
}

/** Both copies, merged. The larger count wins, so losing either copy never gives labels back. */
export async function loadCounter(chain: Keychain, plain: KeyValueStore): Promise<Counter> {
  return mergeCounters(loadCounterFast(chain), await loadCounterPlain(plain));
}

/** Writes both copies. A failure in one never stops the other. */
export async function saveCounter(chain: Keychain, plain: KeyValueStore, c: Counter): Promise<void> {
  const text = JSON.stringify(c);
  try {
    chain.set(COUNTER_KEY, text);
  } catch {
    /* the plain copy below still keeps it */
  }
  try {
    await plain.setItem(COUNTER_KEY, text);
  } catch {
    /* the Keychain copy above still keeps it */
  }
}

/** What was last confirmed paid, so a paid grower is not locked out when the phone has no signal. */
export function loadEntitlement(chain: Keychain): Entitlement {
  try {
    return readEntitlement(parse(chain.get(ENTITLEMENT_KEY)));
  } catch {
    return NO_ENTITLEMENT;
  }
}

export function saveEntitlement(chain: Keychain, e: Entitlement): void {
  try {
    chain.set(ENTITLEMENT_KEY, JSON.stringify(e));
  } catch {
    /* the next answer from the store tries again */
  }
}
