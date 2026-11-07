import { describe, it, expect } from "vitest";
import { dragTarget } from "./reorder";

describe("dragTarget", () => {
  it("stays put for a small movement", () => {
    expect(dragTarget(2, 20, 100, 5)).toBe(2);
    expect(dragTarget(2, -20, 100, 5)).toBe(2);
  });

  it("moves by whole cards, rounding to the nearest", () => {
    expect(dragTarget(1, 160, 100, 5)).toBe(3);
    expect(dragTarget(3, -140, 100, 5)).toBe(2);
    expect(dragTarget(3, -160, 100, 5)).toBe(1);
  });

  it("never leaves the list", () => {
    expect(dragTarget(1, 5000, 100, 4)).toBe(3);
    expect(dragTarget(2, -5000, 100, 4)).toBe(0);
  });

  it("copes with bad numbers", () => {
    expect(dragTarget(2, NaN, 100, 5)).toBe(2);
    expect(dragTarget(2, 50, 0, 5)).toBe(2);
    expect(dragTarget(0, 50, 100, 0)).toBe(0);
  });
});
