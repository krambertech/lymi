import { describe, expect, it } from "vitest";
import { QUIET_AFTER_DAYS, reminderFor, remindersQuiet } from "./reminders";
import type { StreakDay } from "./streak";

const met = (date: string, attempts = 25): StreakDay => ({
  date,
  attempts,
  goal: 25,
  satisfied: true,
  outcome: "goal_met",
});
const short = (date: string, attempts: number): StreakDay => ({
  date,
  attempts,
  goal: 25,
  satisfied: false,
  outcome: "open",
});
const today = "2026-10-12";
const ask = (days: StreakDay[], due = 10, date = today) =>
  reminderFor({ date, days, due, goal: 25 });

describe("reminderFor", () => {
  it("says what is ready on a day not started", () => {
    expect(ask([met("2026-10-09"), met("2026-10-10"), met("2026-10-11")])).toEqual({
      message: "ready",
      count: 10,
    });
  });

  it("counts toward the goal once the day has started", () => {
    expect(ask([met("2026-10-11"), short(today, 19)], 40)).toEqual({
      message: "to_goal",
      count: 6,
    });
  });

  it("names the cards left when fewer remain than the goal asks for", () => {
    expect(ask([short(today, 19)], 3)).toEqual({ message: "to_goal", count: 3 });
  });

  it("stays silent once the goal is met or cards ran out", () => {
    expect(ask([met(today)])).toBeNull();
    expect(ask([{ ...short(today, 4), satisfied: true, outcome: "exhausted" }])).toBeNull();
    expect(ask([short(today, 25)])).toBeNull();
  });

  it("stays silent with nothing to review", () => {
    expect(ask([short(today, 3)], 0)).toBeNull();
    expect(ask([], 0)).toBeNull();
  });

  it("says yesterday was a rest day, the morning after one", () => {
    expect(ask([met("2026-10-09"), met("2026-10-10"), short("2026-10-11", 2)])).toEqual({
      message: "after_rest",
      count: 10,
    });
    expect(ask([met("2026-10-09"), met("2026-10-10")])).toEqual({
      message: "after_rest",
      count: 10,
    });
  });

  it("leaves the rest day out once the day has started", () => {
    expect(ask([met("2026-10-10"), short(today, 5)], 40)?.message).toBe("to_goal");
  });

  it("never mentions a streak that ended", () => {
    // 9 October was the rest day, so missing 10 and 11 October ended the run.
    expect(ask([met("2026-10-07"), met("2026-10-08")])?.message).toBe("ready");
  });

  it("says the next cards are ready the day after a first review", () => {
    expect(ask([short("2026-10-11", 6)])).toEqual({ message: "next_cards", count: 10 });
    expect(ask([met("2026-10-11")])?.message).toBe("next_cards");
  });

  it("says so only on that day", () => {
    expect(ask([short("2026-10-10", 6)])?.message).toBe("ready");
    expect(ask([short("2026-10-10", 6), short("2026-10-11", 6)])?.message).toBe("ready");
  });

  it("does not take a nothing-due visit for a first review", () => {
    const visit: StreakDay = { ...short("2026-10-11", 0), outcome: "nothing_due" };
    expect(ask([visit])?.message).toBe("ready");
  });

  it("reads a day still to come as one the learner stayed away from", () => {
    const days = [met("2026-10-10"), met("2026-10-11"), short(today, 4)];
    expect(ask(days, 10, "2026-10-13")?.message).toBe("after_rest");
    expect(ask(days, 10, "2026-10-14")?.message).toBe("ready");
    expect(ask(days, 10, "2026-10-15")?.message).toBe("ready");
  });
});

describe("remindersQuiet", () => {
  const opened = new Date("2026-10-05T09:00:00Z");
  const after = (ms: number) => new Date(opened.getTime() + ms);
  const week = QUIET_AFTER_DAYS * 24 * 60 * 60 * 1000;

  it("keeps reminding for seven days after the last opening", () => {
    expect(remindersQuiet(opened, after(week - 1))).toBe(false);
  });

  it("stops at seven days", () => {
    expect(remindersQuiet(opened, after(week))).toBe(true);
  });
});
