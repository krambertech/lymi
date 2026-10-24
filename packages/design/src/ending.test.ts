import { describe, expect, it } from "vitest";
import { END_OF_REVIEW, emberCount, endEmbers, fleckAt, lightBurst, sparkAt } from "./ending";

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

describe("the spark", () => {
  it("leaves the flame for today's light before the hop, and the run ticks after the ways on", () => {
    const at = END_OF_REVIEW;
    expect(at.spark).toBeGreaterThan(at.lights);
    expect(at.land).toBeGreaterThan(at.spark);
    expect(at.hop).toBeGreaterThan(at.land);
    expect(at.tick).toBeGreaterThan(at.hop);
  });

  it("starts at one point and ends at the other", () => {
    const from = { x: 10, y: 20 };
    const to = { x: 200, y: 400 };
    expect(sparkAt(0, from, to, 90)).toEqual(from);
    expect(sparkAt(1, from, to, 90)).toEqual(to);
  });
});

describe("lightBurst", () => {
  it("throws every fleck upward, and each one is gone once its life is spent", () => {
    const burst = lightBurst(10);
    expect(burst).toHaveLength(10);
    for (const f of burst) {
      expect(f.vy).toBeLessThan(0);
      expect(fleckAt(f, f.at + f.life / 2).opacity).toBeGreaterThan(0);
      expect(fleckAt(f, f.at + f.life).opacity).toBe(0);
    }
  });
});
