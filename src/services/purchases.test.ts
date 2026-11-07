import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStore } from "../storage/storage";
import { PLAN_ANNUAL, PLAN_MONTHLY } from "../core/entitlement";

const NOW = Date.now();
const DAY = 86_400_000;

// A stand in for the store and the Keychain. Nothing here pretends a purchase happened:
// each test says exactly what the store answers.
const store = {
  active: [] as unknown[],
  failActive: false,
  restoreCalls: 0,
  failRestore: false,
  products: [] as unknown[],
};
const vault = new Map<string, string>();

vi.mock("react-native", () => ({ Platform: { OS: "ios" }, AppState: { addEventListener: () => ({ remove: () => undefined }) } }));
vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItem: (k: string) => vault.get(k) ?? null,
  setItem: (k: string, v: string) => void vault.set(k, v),
}));
import { restore, loadPlans, cachedEntitlement, injectStoreLibrary } from "./iap";

injectStoreLibrary({
  getActiveSubscriptions: async () => {
    if (store.failActive) throw new Error("offline");
    return store.active;
  },
  restorePurchases: async () => {
    store.restoreCalls += 1;
    if (store.failRestore) throw new Error("offline");
  },
  fetchProducts: async () => store.products,
  initConnection: async () => true,
});
import { keychain } from "./keychain";
import { COUNTER_KEY, loadCounter, loadCounterFast, saveCounter } from "./purchaseStore";

beforeEach(() => {
  vault.clear();
  Object.assign(store, { active: [], failActive: false, restoreCalls: 0, failRestore: false, products: [] });
});

describe("restore purchases", () => {
  it("asks the store, then reports the plan it says is active, and remembers it", async () => {
    store.active = [{ productId: PLAN_ANNUAL, isActive: true, expirationDateIOS: NOW + 60 * DAY }];
    const e = await restore();
    expect(store.restoreCalls).toBe(1);
    expect(e.until).toBe(NOW + 60 * DAY);
    expect(cachedEntitlement().until).toBe(NOW + 60 * DAY);
  });

  it("finds nothing when the store has no active plan, and grants nothing", async () => {
    const e = await restore();
    expect(e).toEqual({ until: null });
    expect(cachedEntitlement()).toEqual({ until: null });
  });

  it("does not grant an expired plan", async () => {
    store.active = [{ productId: PLAN_MONTHLY, isActive: false, expirationDateIOS: NOW - DAY }];
    expect((await restore()).until).toBeNull();
  });

  it("when the store cannot be reached, fails and leaves what was remembered untouched", async () => {
    vault.set("labelleaf.entitlement.v1", JSON.stringify({ until: NOW + 10 * DAY }));
    store.failRestore = true;
    await expect(restore()).rejects.toThrow();
    expect(cachedEntitlement().until).toBe(NOW + 10 * DAY);
  });
});

describe("plans from the store", () => {
  it("returns the store's own prices for exactly the two products", async () => {
    store.products = [
      { id: PLAN_MONTHLY, displayPrice: "$5.99" },
      { id: "com.other", displayPrice: "$1.00" },
      { id: PLAN_ANNUAL, displayPrice: "$45.99" },
    ];
    const plans = await loadPlans();
    expect(plans.map((p) => [p.id, p.displayPrice])).toEqual([
      [PLAN_ANNUAL, "$45.99"],
      [PLAN_MONTHLY, "$5.99"],
    ]);
  });
});

describe("the count survives a reinstall", () => {
  it("is read back from the Keychain when the app's own storage is gone", async () => {
    await saveCounter(keychain, new MemoryStore(), { used: 17 });
    // A reinstall wipes the app's own storage, a fresh MemoryStore here, but not the Keychain.
    expect(loadCounterFast(keychain)).toEqual({ used: 17 });
    expect(await loadCounter(keychain, new MemoryStore())).toEqual({ used: 17 });
  });

  it("is read back from plain storage when the Keychain cannot be read", async () => {
    const plain = new MemoryStore();
    await saveCounter(keychain, plain, { used: 9 });
    vault.clear();
    expect(await loadCounter(keychain, plain)).toEqual({ used: 9 });
  });

  it("starts at zero on a fresh phone and reads damage as zero", async () => {
    expect(await loadCounter(keychain, new MemoryStore())).toEqual({ used: 0 });
    vault.set(COUNTER_KEY, "not json");
    expect(loadCounterFast(keychain)).toEqual({ used: 0 });
  });
});
