/**
 * What the grower has paid for. Plain logic with no native code, tested without a phone.
 *
 * LabelLeaf Unlimited is one subscription group with two plans. Both product ids are defined here and
 * nowhere else. An active plan lifts the free label count. Nothing else changes with payment: every
 * feature works in the free app.
 *
 * Prices live on Apple's side and the paywall shows the store's own answer, never a number typed here.
 */

/** App Store Connect app id 6832112416, subscription group "LabelLeaf Unlimited". */
export const PLAN_MONTHLY = "com.gatheringmoss.labelleaf.monthly";
export const PLAN_ANNUAL = "com.gatheringmoss.labelleaf.annual";

/** In the order the paywall shows them. */
export const SUBSCRIPTION_SKUS = [PLAN_ANNUAL, PLAN_MONTHLY] as const;

/** What the app remembers, so a paid grower is not locked out when the phone has no signal. */
export interface Entitlement {
  /** When the current paid period ends, in milliseconds. Null when there is no subscription. */
  until: number | null;
}

export const NO_ENTITLEMENT: Entitlement = { until: null };

/** Active only while a paid period has not ended. Expired or none means the free count rules apply. */
export function isEntitled(e: Entitlement | null | undefined, now: number): boolean {
  return !!e && typeof e.until === "number" && Number.isFinite(e.until) && e.until > now;
}

/** Reads a saved entitlement. Anything damaged reads as none. */
export function readEntitlement(raw: unknown): Entitlement {
  const until = (raw as { until?: unknown } | null)?.until;
  return { until: typeof until === "number" && Number.isFinite(until) ? until : null };
}

/** The slice of the store's answer this app reads. */
export interface ActiveSub {
  productId: string;
  isActive: boolean;
  expirationDateIOS?: number | null;
}

const DAY = 86_400_000;

/** Works out the entitlement from the store's active subscriptions. Other products are ignored. */
export function entitlementFrom(subs: ActiveSub[], now: number): Entitlement {
  let until = 0;
  for (const s of subs) {
    if (!s.isActive || !(SUBSCRIPTION_SKUS as readonly string[]).includes(s.productId)) continue;
    // An active plan with no date from the store counts for a day, then is asked about again.
    const end = typeof s.expirationDateIOS === "number" && s.expirationDateIOS > 0 ? s.expirationDateIOS : now + DAY;
    until = Math.max(until, end);
  }
  return { until: until > now ? until : null };
}

/** The slice of a store product the paywall reads. */
export interface PlanProduct {
  id: string;
  displayPrice: string;
}

/** Plans in the order the paywall shows them. Anything else the store sends is dropped. */
export function orderPlans<T extends { id: string }>(products: T[]): T[] {
  return (SUBSCRIPTION_SKUS as readonly string[])
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is T => !!p);
}

/** Whether this build can sell at all: the store product on an iPhone. */
export const canSell = (platform: string): boolean => platform === "ios";
