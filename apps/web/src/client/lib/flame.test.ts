import type { StreakOut } from "@lymi/core";
import { describe, expect, it } from "vitest";
import {
  FLAME_SIZE,
  flameSize,
  lanternFor,
  STREAK_FLAME_SIZE,
  type StreakFlameState,
  streakFlameFor,
} from "./flame";

describe("flameSize", () => {
  it("is out only when the streak has broken", () => {
    expect(flameSize(0.5, true)).toBe(FLAME_SIZE.out);
    expect(flameSize(0)).toBeGreaterThan(FLAME_SIZE.out);
  });

  it("is the brand flame without a learner's progress", () => {
    expect(flameSize(undefined)).toBe(1);
  });

  it("grows with every review and stops short of full until the goal", () => {
    const goal = 50;
    let previous = flameSize(0);
    expect(previous).toBe(FLAME_SIZE.start);
    for (let reviewed = 1; reviewed < goal; reviewed++) {
      const size = flameSize(reviewed / goal);
      expect(size).toBeGreaterThan(previous);
      expect(size).toBeLessThanOrEqual(FLAME_SIZE.nearly);
      previous = size;
    }
    expect(flameSize(1)).toBe(FLAME_SIZE.full);
    expect(flameSize(1.4)).toBe(FLAME_SIZE.full);
  });
});

describe("lanternFor", () => {
  const summary = (
    current: number,
    attempts: number,
    outcome: StreakOut["today"]["outcome"] = "open",
  ): StreakOut => ({
    today: { date: "2026-09-13", attempts, goal: 50, outcome },
    goal: 50,
    current,
    longest: current,
    reviewedDays: current,
    days: [],
  });

  it("has no flame without a streak, however much today holds", () => {
    expect(lanternFor(summary(0, 0))).toEqual({ out: true, progress: 0 });
    expect(lanternFor(summary(0, 49))).toEqual({ out: true, progress: 0 });
  });

  it("grows with today's attempts while a streak is alive", () => {
    expect(lanternFor(summary(4, 0))).toEqual({ out: false, progress: 0 });
    expect(lanternFor(summary(4, 25))).toEqual({ out: false, progress: 0.5 });
  });

  it("stands full once today's goal counts, including an exhausted queue", () => {
    expect(lanternFor(summary(5, 50, "goal_met"))).toEqual({ out: false, progress: 1 });
    expect(lanternFor(summary(1, 12, "exhausted"))).toEqual({ out: false, progress: 1 });
  });

  it("keeps the small flame on a nothing-due day", () => {
    expect(lanternFor(summary(4, 0, "nothing_due"))).toEqual({ out: false, progress: 0 });
  });

  it("is the brand flame before the streak loads", () => {
    expect(lanternFor(undefined)).toEqual({ out: false, progress: undefined });
  });
});

describe("streakFlameFor", () => {
  const summary = (
    current: number,
    attempts: number,
    outcome: StreakOut["today"]["outcome"] = "open",
  ): StreakOut => ({
    today: { date: "2026-09-13", attempts, goal: 50, outcome },
    goal: 50,
    current,
    longest: current,
    reviewedDays: current,
    days: [],
  });

  const cases: [string, StreakOut, StreakFlameState][] = [
    ["a new learner", summary(0, 0), "out"],
    ["no streak with reviews short of the goal", summary(0, 49), "out"],
    ["a streak with today's goal open", summary(4, 0), "lit"],
    ["a streak partway to the goal", summary(4, 30), "lit"],
    ["the goal met, starting a streak", summary(1, 50, "goal_met"), "full"],
    ["the goal met on a streak", summary(5, 60, "goal_met"), "full"],
    ["an exhausted queue", summary(2, 12, "exhausted"), "full"],
    ["a confirmed nothing-due day", summary(4, 0, "nothing_due"), "lit"],
  ];

  it.each(cases)("shows %s", (_, s, state) => {
    expect(streakFlameFor(s)).toBe(state);
  });

  it.each(cases)("agrees with the lantern for %s", (_, s) => {
    const lantern = lanternFor(s);
    const state = streakFlameFor(s);
    expect(state === "out").toBe(lantern.out);
    expect(state === "full").toBe(flameSize(lantern.progress, lantern.out) === FLAME_SIZE.full);
    expect(STREAK_FLAME_SIZE[state] === FLAME_SIZE.out).toBe(lantern.out);
  });
});
