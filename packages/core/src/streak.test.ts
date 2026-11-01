import { describe, expect, it } from "vitest";
import {
  bestStreak,
  daySatisfied,
  daysReviewed,
  keepsRun,
  runDates,
  type StreakDay,
  streakLength,
  summariseStreak,
} from "./streak";

const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe("streakLength", () => {
  it("counts back from today", () => {
    expect(streakLength([0, 1, 2, 3, 4])).toBe(4);
  });

  it("keeps the streak while today is still open", () => {
    expect(streakLength([1, 1, 1, 0])).toBe(3);
  });

  it("breaks on a finished day with no review", () => {
    expect(streakLength([1, 1, 0, 1])).toBe(1);
  });

  it("is zero when yesterday was missed and today is open", () => {
    expect(streakLength([1, 1, 0, 0])).toBe(0);
  });

  it("handles an empty window", () => {
    expect(streakLength([])).toBe(0);
  });
});

describe("bestStreak", () => {
  it("finds the longest run anywhere", () => {
    expect(bestStreak([1, 1, 1, 0, 1, 1])).toBe(3);
  });

  it("is zero with no reviews", () => {
    expect(bestStreak([0, 0])).toBe(0);
  });
});

describe("daysReviewed", () => {
  it("counts reviewed days in the last seven", () => {
    expect(daysReviewed([9, 9, 9, 0, 1, 0, 2, 3, 0])).toBe(4);
  });
});

describe("summariseStreak", () => {
  const day = (date: string, kind: "met" | "missed" | "nothing"): StreakDay => ({
    date,
    attempts: kind === "nothing" ? 0 : 3,
    goal: 3,
    satisfied: kind === "met",
    outcome: kind === "met" ? "goal_met" : kind === "nothing" ? "nothing_due" : "open",
  });

  it("keeps yesterday's run while today is unfinished", () => {
    const days = [day("2026-09-11", "met"), day("2026-09-12", "met"), day("2026-09-13", "missed")];

    expect(summariseStreak(days, "2026-09-13").current).toBe(2);
  });

  it("lets a nothing-due day carry a run without adding to it", () => {
    const days = [day("2026-09-10", "met"), day("2026-09-11", "nothing"), day("2026-09-12", "met")];

    expect(summariseStreak(days, "2026-09-12")).toMatchObject({ current: 2, longest: 2 });
  });

  it("breaks on a missed day or a day with no visit", () => {
    const days = [
      day("2026-09-05", "met"),
      day("2026-09-06", "met"),
      day("2026-09-07", "met"),
      day("2026-09-08", "missed"),
      day("2026-09-09", "met"),
      day("2026-09-11", "met"),
    ];

    expect(summariseStreak(days, "2026-09-11")).toMatchObject({
      current: 1,
      longest: 4,
      reviewedDays: 6,
      restDays: ["2026-09-08"],
    });
  });

  /** Every day from `from` to `to` met, except the ones given. */
  const met = (from: string, to: string, except: Record<string, StreakDay | null> = {}) => {
    const out: StreakDay[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (d in except) {
        const e = except[d];
        if (e) out.push(e);
      } else out.push(day(d, "met"));
    }
    return out;
  };
  const short = (date: string, attempts: number): StreakDay => ({
    date,
    attempts,
    goal: 50,
    satisfied: false,
    outcome: "open",
  });

  it("bridges one short day inside a run without adding it", () => {
    const days = met("2026-09-12", "2026-09-23", { "2026-09-17": short("2026-09-17", 42) });

    expect(summariseStreak(days, "2026-09-24")).toMatchObject({
      current: 11,
      longest: 11,
      restDays: ["2026-09-17"],
    });
  });

  it("holds the run through a missed yesterday while today is open", () => {
    const days = met("2026-09-12", "2026-09-22");

    expect(summariseStreak(days, "2026-09-24")).toMatchObject({
      current: 11,
      restDays: ["2026-09-23"],
    });
  });

  it("breaks on a second short day within seven days of a rest day", () => {
    const days = met("2026-09-12", "2026-09-23", {
      "2026-09-17": null,
      "2026-09-20": short("2026-09-20", 12),
    });

    expect(summariseStreak(days, "2026-09-24")).toMatchObject({
      current: 3,
      longest: 7,
      restDays: ["2026-09-17"],
    });
  });

  it("allows the next rest day a week after the last", () => {
    const days = met("2026-09-01", "2026-09-20", { "2026-09-05": null, "2026-09-12": null });

    expect(summariseStreak(days, "2026-09-21")).toMatchObject({
      current: 18,
      restDays: ["2026-09-05", "2026-09-12"],
    });
  });

  it("forgets rest days from before the run began", () => {
    const days = met("2026-09-01", "2026-09-10", {
      "2026-09-03": null,
      "2026-09-05": null,
      "2026-09-07": null,
    });

    expect(summariseStreak(days, "2026-09-11")).toMatchObject({
      current: 4,
      restDays: ["2026-09-03", "2026-09-07"],
    });
  });

  it("gives no rest day before a run has a counted day", () => {
    const days = [day("2026-09-10", "nothing"), day("2026-09-12", "met")];

    expect(summariseStreak(days, "2026-09-13")).toMatchObject({ current: 1, restDays: [] });
  });

  it("carries a rest day past nothing-due neighbours", () => {
    const days = [
      day("2026-09-10", "met"),
      day("2026-09-11", "nothing"),
      day("2026-09-13", "nothing"),
      day("2026-09-14", "met"),
    ];

    expect(summariseStreak(days, "2026-09-14")).toMatchObject({
      current: 2,
      restDays: ["2026-09-12"],
    });
  });

  it("bridges days from before goals the same way", () => {
    const legacy = (date: string): StreakDay => ({
      date,
      attempts: 4,
      goal: null,
      satisfied: true,
      outcome: null,
    });
    const days = [legacy("2026-03-01"), legacy("2026-03-02"), legacy("2026-03-04")];

    expect(summariseStreak(days, "2026-03-05")).toMatchObject({
      current: 3,
      longest: 3,
      restDays: ["2026-03-03"],
    });
  });
});

describe("the day rule", () => {
  const day = (date: string, outcome: StreakDay["outcome"], satisfied = false): StreakDay => ({
    date,
    attempts: 0,
    goal: 25,
    satisfied,
    outcome,
  });

  it("counts a met or exhausted day, and nothing else", () => {
    expect(daySatisfied("goal_met")).toBe(true);
    expect(daySatisfied("exhausted")).toBe(true);
    expect(daySatisfied("nothing_due")).toBe(false);
    expect(daySatisfied("open")).toBe(false);
    expect(daySatisfied(null)).toBe(false);
  });

  it("keeps the run through a counted or nothing-due day", () => {
    expect(keepsRun(day("2026-03-01", "goal_met", true))).toBe(true);
    expect(keepsRun(day("2026-03-01", "nothing_due"))).toBe(true);
    expect(keepsRun(day("2026-03-01", "open"))).toBe(false);
    expect(keepsRun(undefined)).toBe(false);
  });

  it("draws the run across counted and rest days, skipping a nothing-due day", () => {
    const days = [
      day("2026-02-28", "open"),
      day("2026-03-01", "goal_met", true),
      day("2026-03-02", "nothing_due"),
      day("2026-03-03", "open"),
      day("2026-03-04", "goal_met", true),
    ];
    expect([...runDates(days, ["2026-03-03"], { date: "2026-03-05", outcome: "open" })]).toEqual([
      "2026-03-04",
      "2026-03-03",
      "2026-03-01",
    ]);
  });

  it("starts from today once today counts, across a month's end", () => {
    const days = [day("2026-02-28", "goal_met", true), day("2026-03-01", "exhausted", true)];
    expect([...runDates(days, [], { date: "2026-03-01", outcome: "exhausted" })]).toEqual([
      "2026-03-01",
      "2026-02-28",
    ]);
  });
});
