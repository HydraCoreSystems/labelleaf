/**
 * Apple in app purchase, through expo-iap. This is the only file that touches it.
 *
 * It loads the library only when a purchase is needed, on an iPhone. In a development build, on the
 * simulator, on Android and on the web there is no store to answer, so nothing completes and nothing
 * is granted: the paywall says the store could not be reached and the count stays as it was.
 * An entitlement exists only because the App Store said so. It is never faked.
 */
import { AppState, Platform } from "react-native";
import {
  SUBSCRIPTION_SKUS,
  canSell,
  entitlementFrom,
  isEntitled,
  orderPlans,
  type ActiveSub,
  type Entitlement,
  type PlanProduct,
} from "../core/entitlement";
import { keychain } from "./keychain";
import { loadEntitlement, saveEntitlement } from "./purchaseStore";

type Iap = typeof import("expo-iap");
let loaded: Iap | null = null;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const iap = (): Iap => (loaded ??= require("expo-iap") as Iap);

/** For tests only: hands in a stand in for the store library. The app itself never calls this. */
export function injectStoreLibrary(lib: unknown): void {
  loaded = lib as Iap;
}

export const iapAvailable = (): boolean => canSell(Platform.OS);

/** What was last confirmed paid, so a paid grower stays unlocked with no signal. */
export const cachedEntitlement = (): Entitlement => loadEntitlement(keychain);

export const cachedUnlimited = (now = Date.now()): boolean => iapAvailable() && isEntitled(cachedEntitlement(), now);

/** Asks the store what is active. Throws when the store cannot be reached. */
async function ask(): Promise<Entitlement> {
  const subs = (await iap().getActiveSubscriptions([...SUBSCRIPTION_SKUS])) as unknown as ActiveSub[];
  const e = entitlementFrom(subs, Date.now());
  saveEntitlement(keychain, e);
  return e;
}

/**
 * Opens the store connection, keeps the entitlement in step with it, and returns a function that closes
 * it. onChange gets each clear answer from the store, and nothing when the store cannot be reached.
 */
export function startIap(onChange: (e: Entitlement) => void): () => void {
  if (!iapAvailable()) return () => undefined;
  let live = true;
  const sync = () =>
    ask()
      .then((e) => live && onChange(e))
      .catch(() => undefined);

  const updated = iap().purchaseUpdatedListener((purchase) => {
    // A purchase only counts once it is finished. Finishing it is how the store knows it was delivered.
    iap()
      .finishTransaction({ purchase, isConsumable: false })
      .catch(() => undefined)
      .then(sync);
  });
  const failed = iap().purchaseErrorListener(() => undefined);
  const awake = AppState.addEventListener("change", (s) => {
    if (s === "active") sync();
  });
  iap()
    .initConnection()
    .then(sync)
    .catch(() => undefined);

  return () => {
    live = false;
    updated.remove();
    failed.remove();
    awake.remove();
    iap().endConnection().catch(() => undefined);
  };
}

/** The plans with the store's own prices. Throws when the store cannot be reached. */
export async function loadPlans(): Promise<PlanProduct[]> {
  const lib = iap();
  await lib.initConnection();
  const subs = ((await lib.fetchProducts({ skus: [...SUBSCRIPTION_SKUS], type: "subs" })) ?? []) as unknown as PlanProduct[];
  return orderPlans(subs);
}

/** Starts a purchase. The answer arrives through the listener started by startIap. */
export async function buy(sku: string): Promise<void> {
  await iap().requestPurchase({ request: { apple: { sku } }, type: "subs" });
}

/** Asks Apple to bring back earlier purchases, then checks. Returns what is now active. */
export async function restore(): Promise<Entitlement> {
  await iap().restorePurchases();
  return ask();
}

/** Opens Apple's page for managing or cancelling a subscription. */
export async function manage(): Promise<void> {
  await iap().deepLinkToSubscriptions({});
}
