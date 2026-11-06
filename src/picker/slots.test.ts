import { describe, it, expect } from "vitest";
import { planRun, slotStates } from "./slots";

describe("start slot picker plan", () => {
  it("leaves the slots before the start slot blank", () => {
    const p = planRun(5, 3);
    expect(p.sheets[0].blankSlots).toEqual([1, 2, 3, 4]);
  });

  it("fills slots in print order from the start slot", () => {
    const p = planRun(5, 3);
    expect(p.sheets[0].filledSlots).toEqual([5, 6, 7]);
    expect(p.sheets[0].emptyAfter).toHaveLength(30 - 7);
    expect(p.sheets[0].emptyAfter[0]).toBe(8);
  });

  it("prints a full sheet from slot 1 with no blanks and no warning", () => {
    const p = planRun(1, 30);
    expect(p.sheets).toHaveLength(1);
    expect(p.sheets[0].blankSlots).toEqual([]);
    expect(p.sheets[0].filledSlots).toHaveLength(30);
    expect(p.spillsOntoSecondSheet).toBe(false);
    expect(p.warning).toBeNull();
  });

  it("warns plainly when a run spills onto a second sheet", () => {
    const p = planRun(25, 10); // slots 25 to 30 on sheet one, 4 more on sheet two
    expect(p.spillsOntoSecondSheet).toBe(true);
    expect(p.sheets).toHaveLength(2);
    expect(p.sheets[0].filledSlots).toEqual([25, 26, 27, 28, 29, 30]);
    expect(p.sheets[1].blankSlots).toEqual([]);
    expect(p.sheets[1].filledSlots).toEqual([1, 2, 3, 4]);
    expect(p.warning).toContain("2 sheets");
    expect(p.warning).toContain("fresh sheet");
  });

  it("prints a single label at one chosen slot", () => {
    const p = planRun(17, 1);
    expect(p.sheets).toHaveLength(1);
    expect(p.sheets[0].blankSlots).toHaveLength(16);
    expect(p.sheets[0].filledSlots).toEqual([17]);
    expect(p.spillsOntoSecondSheet).toBe(false);
  });

  it("covers slot 30 and slot 1 as the edges", () => {
    expect(planRun(30, 1).sheets[0].filledSlots).toEqual([30]);
    expect(planRun(1, 1).sheets[0].filledSlots).toEqual([1]);
  });

  it("clamps a bad start slot into range", () => {
    expect(planRun(0, 1).startSlot).toBe(1);
    expect(planRun(99, 1).startSlot).toBe(30);
  });

  it("plans no sheets for an empty queue", () => {
    const p = planRun(1, 0);
    expect(p.sheets).toEqual([]);
    expect(p.warning).toBeNull();
  });

  it("describes every slot for the grid", () => {
    const states = slotStates(planRun(3, 2), 0);
    expect(states).toHaveLength(30);
    expect(states.slice(0, 5)).toEqual(["blank", "blank", "fill", "fill", "empty"]);
  });

  it("agrees with the lifted sheet chunking on the number of labels per sheet", () => {
    const p = planRun(5, 35);
    expect(p.sheets[0].filledSlots).toHaveLength(26);
    expect(p.sheets[1].filledSlots).toHaveLength(9);
  });
});
