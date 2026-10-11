import { describe, expect, it } from "vitest";
import { emberCount, endEmbers } from "./ending";

describe("emberCount", () => {
  it("rises for any review, grows with the share of the goal added, and stops at twice the goal", () => {
    expect(emberCount(0, 50)).toBe(0);
    expect(emberCount(1, 50)).toBe(3);
    expect(emberCount(12.5, 50)).toBe(6);
    expect(emberCount(25, 50)).toBe(9);
    expect(emberCount(50, 50)).toBe(14);
    expect(emberCount(100, 50)).toBe(20);
    expect(emberCount(400, 50)).toBe(20);
    for (let n = 1; n < 120; n++) {
      expect(emberCount(n + 1, 50)).toBeGreaterThanOrEqual(emberCount(n, 50));
    }
  });
});

describe("endEmbers", () => {
  it("lifts every ember upward and lets the last one leave within the spread", () => {
    const embers = endEmbers(20);
    expect(embers).toHaveLength(20);
    for (const e of embers) expect(e.y).toBeLessThan(0);
    expect(Math.max(...embers.map((e) => e.at))).toBeLessThanOrEqual(1400);
  });
});
