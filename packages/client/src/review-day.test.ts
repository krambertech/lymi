import type { StreakOut } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { streakToday } from "./review-day";

const met = (date: string) => ({
  date,
  attempts: 50,
  goal: 50,
  satisfied: true,
  outcome: "goal_met" as const,
});

/** A read from Tuesday morning: Saturday to Monday met, Tuesday open with a few reviews. */
const tuesday = (over: Partial<StreakOut> = {}): StreakOut => ({
  today: { date: "2026-10-13", attempts: 12, goal: 50, outcome: "open" },
  goal: 50,
  current: 3,
  longest: 3,
  reviewedDays: 4,
  restDays: [],
  days: [
    met("2026-10-10"),
    met("2026-10-11"),
    met("2026-10-12"),
    { date: "2026-10-13", attempts: 12, goal: 50, satisfied: false, outcome: "open" },
  ],
  ...over,
});

const on = (date: string, attempts: number) => ({
  day: { date, start: new Date(`${date}T00:00:00Z`), end: new Date(`${date}T23:59:59Z`) },
  attempts,
});

describe("the streak on a new day from an earlier read", () => {
  it("makes the short day since the read a rest day, as the server would", () => {
    const after = streakToday(tuesday(), on("2026-10-14", 51));

    expect(after.restDays).toEqual(["2026-10-13"]);
    expect(after.current).toBe(4);
    expect(after.today).toMatchObject({ date: "2026-10-14", attempts: 51, outcome: "goal_met" });
  });

  it("ends the run when the short day falls within a week of the last rest day", () => {
    const read = tuesday({
      restDays: ["2026-10-09"],
      days: [met("2026-10-08"), ...tuesday().days],
    });

    const after = streakToday(read, on("2026-10-14", 51));

    expect(after.restDays).toEqual(["2026-10-09"]);
    expect(after.current).toBe(1);
  });

  it("keeps a same-day read's rest days as they are", () => {
    const read = tuesday({ restDays: ["2026-10-09"] });

    expect(streakToday(read, on("2026-10-13", 20)).restDays).toEqual(["2026-10-09"]);
  });
});
