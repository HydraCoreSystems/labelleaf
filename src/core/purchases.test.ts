import { describe, it, expect } from "vitest";
import { FREE_LABELS, addLabels, labelsInRun, mergeCounters, printGate, readCounter, remaining } from "./counter";
import {
  PLAN_ANNUAL,
  PLAN_MONTHLY,
  SUBSCRIPTION_SKUS,
  canSell,
  entitlementFrom,
  isEntitled,
  orderPlans,
  readEntitlement,
} from "./entitlement";
import { planRun } from "../picker/slots";

const NOW = Date.parse("2026-11-07T12:00:00Z");
const DAY = 86_400_000;

describe("product ids", () => {
  it("are exactly the two products created in App Store Connect, defined once", () => {
    expect(PLAN_MONTHLY).toBe("com.gatheringmoss.labelleaf.monthly");
    expect(PLAN_ANNUAL).toBe("com.gatheringmoss.labelleaf.annual");
    expect([...SUBSCRIPTION_SKUS].sort()).toEqual([PLAN_ANNUAL, PLAN_MONTHLY].sort());
  });

  it("orders plans yearly then monthly and drops anything else the store sends", () => {
    const got = orderPlans([{ id: PLAN_MONTHLY }, { id: "other" }, { id: PLAN_ANNUAL }]);
    expect(got.map((p) => p.id)).toEqual([PLAN_ANNUAL, PLAN_MONTHLY]);
  });

  it("can sell only on an iPhone", () => {
    expect(canSell("ios")).toBe(true);
    expect(canSell("android")).toBe(false);
    expect(canSell("web")).toBe(false);
  });
});

describe("the free label count", () => {
  it("gives thirty free labels", () => {
    expect(FREE_LABELS).toBe(30);
    expect(remaining({ used: 0 }, false)).toBe(30);
    expect(remaining({ used: 12 }, false)).toBe(18);
    expect(remaining({ used: 30 }, false)).toBe(0);
    expect(remaining({ used: 400 }, false)).toBe(0);
  });

  it("counts one per label in the run, and blank slots before the start are not labels", () => {
    const plan = planRun(14, 5, 30);
    expect(plan.sheets[0].blankSlots.length).toBe(13);
    expect(labelsInRun(5)).toBe(5);
    expect(labelsInRun(0)).toBe(0);
    expect(labelsInRun(-3)).toBe(0);
  });

  it("counts a run that spans two sheets once per label", () => {
    expect(labelsInRun(40)).toBe(40);
  });

  it("adds, ignores nonsense and reads damaged data as zero", () => {
    expect(addLabels({ used: 3 }, 4)).toEqual({ used: 7 });
    expect(addLabels({ used: 3 }, -5)).toEqual({ used: 3 });
    expect(addLabels({ used: 3 }, 2.9)).toEqual({ used: 5 });
    expect(readCounter(null)).toEqual({ used: 0 });
    expect(readCounter({ used: -1 })).toEqual({ used: 0 });
    expect(readCounter({ used: "many" })).toEqual({ used: 0 });
    expect(readCounter({ used: 17 })).toEqual({ used: 17 });
  });

  it("keeps the larger of two copies, so losing one never gives labels back", () => {
    expect(mergeCounters({ used: 12 }, { used: 0 })).toEqual({ used: 12 });
    expect(mergeCounters({ used: 0 }, { used: 12 })).toEqual({ used: 12 });
  });
});

describe("the entitlement", () => {
  it("is on only while a paid period has not ended", () => {
    expect(isEntitled({ until: NOW + DAY }, NOW)).toBe(true);
    expect(isEntitled({ until: NOW }, NOW)).toBe(false);
    expect(isEntitled({ until: NOW - DAY }, NOW)).toBe(false);
    expect(isEntitled({ until: null }, NOW)).toBe(false);
    expect(isEntitled(null, NOW)).toBe(false);
  });

  it("reads from the store's active subscriptions and ignores other products", () => {
    expect(entitlementFrom([{ productId: PLAN_ANNUAL, isActive: true, expirationDateIOS: NOW + 90 * DAY }], NOW)).toEqual({ until: NOW + 90 * DAY });
    expect(entitlementFrom([{ productId: PLAN_MONTHLY, isActive: false, expirationDateIOS: NOW + DAY }], NOW)).toEqual({ until: null });
    expect(entitlementFrom([{ productId: "com.other.thing", isActive: true, expirationDateIOS: NOW + DAY }], NOW)).toEqual({ until: null });
    expect(entitlementFrom([{ productId: PLAN_MONTHLY, isActive: true, expirationDateIOS: NOW - DAY }], NOW)).toEqual({ until: null });
    expect(entitlementFrom([], NOW)).toEqual({ until: null });
  });

  it("takes the later of two active plans", () => {
    const e = entitlementFrom(
      [
        { productId: PLAN_MONTHLY, isActive: true, expirationDateIOS: NOW + 5 * DAY },
        { productId: PLAN_ANNUAL, isActive: true, expirationDateIOS: NOW + 200 * DAY },
      ],
      NOW
    );
    expect(e.until).toBe(NOW + 200 * DAY);
  });

  it("reads damaged saved data as none", () => {
    expect(readEntitlement(null)).toEqual({ until: null });
    expect(readEntitlement({ until: "soon" })).toEqual({ until: null });
    expect(readEntitlement({ until: NOW })).toEqual({ until: NOW });
  });
});

describe("the gate on the print action", () => {
  it("lets a run through when it fits what is left, up to exactly the thirtieth label", () => {
    expect(printGate({ used: 0 }, false, 30)).toEqual({ allowed: true });
    expect(printGate({ used: 25 }, false, 5)).toEqual({ allowed: true });
  });

  it("opens the paywall when the run does not fit, and says what is left", () => {
    expect(printGate({ used: 25 }, false, 6)).toEqual({ allowed: false, left: 5, needed: 6 });
    expect(printGate({ used: 30 }, false, 1)).toEqual({ allowed: false, left: 0, needed: 1 });
    expect(printGate({ used: 0 }, false, 31)).toEqual({ allowed: false, left: 30, needed: 31 });
  });

  it("removes the limit entirely while a subscription is active", () => {
    expect(printGate({ used: 5000 }, true, 500)).toEqual({ allowed: true });
  });

  it("applies the free count again when the subscription has expired", () => {
    const expired = isEntitled({ until: NOW - DAY }, NOW);
    expect(printGate({ used: 30 }, expired, 1).allowed).toBe(false);
  });
});
