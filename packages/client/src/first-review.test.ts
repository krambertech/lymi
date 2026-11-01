import { describe, expect, it } from "vitest";
import { comesBackIn, nextCards, reminderChoices } from "./first-review";

const dayEnd = new Date("2026-10-18T22:00:00Z");

describe("comesBackIn", () => {
  it("brings a forgotten card back later today, whatever its schedule says", () => {
    expect(comesBackIn(1, "2026-10-18T10:10:00Z", dayEnd)).toBe(0);
  });

  it("holds a card due again today for tomorrow, because it waits for the next day's review", () => {
    expect(comesBackIn(2, "2026-10-18T10:10:00Z", dayEnd)).toBe(1);
  });

  it("counts learner days from the end of today", () => {
    expect(comesBackIn(3, "2026-10-19T09:00:00Z", dayEnd)).toBe(1);
    expect(comesBackIn(3, "2026-10-20T09:00:00Z", dayEnd)).toBe(2);
    expect(comesBackIn(4, "2026-10-28T09:00:00Z", dayEnd)).toBe(10);
  });
});

const days = (...counts: number[]) =>
  counts.map((count, i) => ({ date: `2026-11-0${i + 1}`, count }));

describe("nextCards", () => {
  it("counts what is left of today into tomorrow", () => {
    expect(nextCards(days(4, 2, 7), 25)).toEqual({ days: 1, count: 6, date: "2026-11-02" });
  });

  it("holds a day to the goal", () => {
    expect(nextCards(days(40, 0), 25)).toEqual({ days: 1, count: 25, date: "2026-11-02" });
  });

  it("names the first later day when tomorrow is empty", () => {
    expect(nextCards(days(0, 0, 5), 25)).toEqual({ days: 2, count: 5, date: "2026-11-03" });
  });

  it("says nothing when the week ahead is empty or unknown", () => {
    expect(nextCards(days(0, 0, 0), 25)).toBeUndefined();
    expect(nextCards(undefined, 25)).toBeUndefined();
  });
});

describe("reminderChoices", () => {
  it("leads with the part of the day they reviewed in, at that time", () => {
    expect(reminderChoices(new Date(2026, 10, 1, 21, 38))).toEqual({
      part: "evening",
      times: { morning: "08:00", lunch: "12:30", evening: "21:30" },
    });
    expect(reminderChoices(new Date(2026, 10, 1, 9, 5)).times.morning).toBe("09:00");
    expect(reminderChoices(new Date(2026, 10, 1, 13, 0)).part).toBe("lunch");
  });
});
