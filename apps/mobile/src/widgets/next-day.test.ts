import type { StreakOut } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { lastSevenDays, weekLetters } from "../ui/days";
import { nextDay, type Snapshot } from "./next-day";

const summary = (current: number, attempts: number): StreakOut => ({
  today: { date: "2026-10-12", attempts, goal: 20, outcome: attempts >= 20 ? "goal_met" : "open" },
  goal: 20,
  current,
  longest: current,
  reviewedDays: current,
  restDays: [],
  days: [],
});

const now = (due: number, streak: number, reviewed: number): Snapshot => ({
  due,
  streak,
  reviewed,
  goal: 20,
  left: Math.max(0, 20 - reviewed),
  out: false,
  signedIn: true,
  week: [1, 1, 1, 1, 1, 1, 0],
  dates: lastSevenDays("2026-10-12"),
});

const midnight = new Date(Date.now() + 3_600_000);
const days = [20, 20, 20, 20, 0, 20, 12];

describe("nextDay", () => {
  it("carries over what is still due, never the cards graded today", () => {
    // Two of three cards graded on this device: one is left today, so one is due at midnight.
    const next = nextDay(now(1, 3, 2), summary(3, 2), days, midnight);
    expect(next?.snapshot.due).toBe(1);
  });

  it("adds the cards that first fall due tomorrow, so a finished day does not show 0", () => {
    expect(nextDay(now(0, 4, 20), summary(4, 20), days, midnight, 9)?.snapshot.due).toBe(9);
    expect(nextDay(now(2, 4, 20), summary(4, 20), days, midnight, 9)?.snapshot.due).toBe(11);
  });

  it("counts every card left, not only the ones the phone holds", () => {
    expect(nextDay(now(300, 3, 0), summary(3, 0), days, midnight)?.snapshot.due).toBe(300);
  });

  it("keeps a run whose goal was met on this device", () => {
    // The summary has this device's grades in it, so the offline goal already counts.
    const next = nextDay(now(0, 4, 20), summary(4, 20), days, midnight);
    expect(next?.snapshot.streak).toBe(4);
    expect(next?.snapshot.out).toBe(false);
  });

  it("opens the new day with nothing reviewed and the week moved on", () => {
    const next = nextDay(now(5, 3, 12), summary(3, 12), days, midnight);
    expect(next?.at).toBe(midnight);
    expect(next?.snapshot).toMatchObject({ reviewed: 0, goal: 20, left: 20 });
    expect(next?.snapshot.week).toHaveLength(7);
    expect(next?.snapshot.week.at(-1)).toBe(0);
  });

  it("names tomorrow's weekdays from the review day, not today's", () => {
    // Monday 12 October's week ends on Monday; the next day's ends on Tuesday.
    const next = nextDay(now(5, 3, 12), summary(3, 12), days, midnight);
    expect(next?.snapshot.dates).toEqual(lastSevenDays("2026-10-13"));
    expect(weekLetters(next?.snapshot.dates ?? []).at(-1)).toBe(weekLetters(["2026-10-13"])[0]);
    expect(weekLetters(next?.snapshot.dates ?? [])).not.toEqual(weekLetters(now(5, 3, 12).dates));
  });

  it("leaves the lantern out with no run", () => {
    expect(nextDay(now(5, 0, 0), summary(0, 0), days, midnight)?.snapshot.out).toBe(true);
  });

  it("sends nothing for a day that has already ended", () => {
    expect(nextDay(now(5, 3, 0), summary(3, 0), days, new Date(Date.now() - 1000))).toBeUndefined();
  });
});
