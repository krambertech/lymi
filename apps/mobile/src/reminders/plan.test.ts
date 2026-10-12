import { describe, expect, it } from "vitest";
import { DAYS_AHEAD, forecastFrom, gradeRevision, lineFor, planReminders, replans } from "./plan";

// The phone's clock in these cases; Node applies a TZ set at run time.
process.env.TZ = "Europe/Tallinn";
const PHONE = "Europe/Tallinn";

const at = (iso: string) => new Date(iso);
const morning = at("2026-10-12T09:00:00");
const byDay = (counts: Record<string, number>) => new Map(Object.entries(counts));

describe("planReminders", () => {
  it("reminds today and each day after while cards are left", () => {
    const plan = planReminders({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 13,
      dayDone: false,
    });
    expect(plan).toHaveLength(DAYS_AHEAD);
    expect(plan[0]).toEqual({ at: at("2026-10-12T19:00:00"), due: 13 });
    expect(plan[1]).toEqual({ at: at("2026-10-13T19:00:00"), due: 13 });
  });

  it("skips today once the day counts, and carries what is left", () => {
    const plan = planReminders({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 4,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 4, "2026-10-13": 6 }),
    });
    expect(plan[0]).toEqual({ at: at("2026-10-13T19:00:00"), due: 10 });
    expect(plan[1]).toEqual({ at: at("2026-10-14T19:00:00"), due: 10 });
  });

  it("stays quiet on days with nothing due", () => {
    const plan = planReminders({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 0,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 0, "2026-10-14": 3 }),
    });
    expect(plan[0]).toEqual({ at: at("2026-10-14T19:00:00"), due: 3 });
  });

  it("schedules nothing when nothing is due and there is no forecast", () => {
    expect(
      planReminders({ time: "19:00", now: morning, zone: PHONE, left: 0, dayDone: true }),
    ).toEqual([]);
  });

  it("leaves today out once its time has passed", () => {
    const plan = planReminders({
      time: "08:30",
      now: morning,
      zone: PHONE,
      left: 2,
      dayDone: false,
    });
    expect(plan[0]?.at).toEqual(at("2026-10-13T08:30:00"));
  });

  it("moves today's reminder to the hour the learner put it off to", () => {
    const plan = planReminders({
      time: "08:30",
      now: morning,
      zone: PHONE,
      left: 2,
      dayDone: false,
      snoozedUntil: at("2026-10-12T10:00:00"),
    });
    expect(plan[0]).toEqual({ at: at("2026-10-12T10:00:00"), due: 2 });
  });

  it("drops a put-off reminder once the day counts", () => {
    const plan = planReminders({
      time: "08:30",
      now: morning,
      zone: PHONE,
      left: 2,
      dayDone: true,
      snoozedUntil: at("2026-10-12T10:00:00"),
    });
    expect(plan[0]?.at).toEqual(at("2026-10-13T08:30:00"));
  });

  it("counts each reminder by the review day it falls on when the review zone runs behind", () => {
    // 09:00 on 13 October in Tallinn is still 12 October in Los Angeles, where the learner reviews.
    const plan = planReminders({
      time: "09:00",
      now: at("2026-10-13T08:00:00"),
      zone: "America/Los_Angeles",
      left: 0,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 0, "2026-10-13": 5 }),
    });
    // The first reminder on the phone's 13 October is still the review day that counts, so it
    // waits for 14 October's 09:00, which is 13 October in Los Angeles, with its five cards.
    expect(plan[0]).toEqual({ at: at("2026-10-14T09:00:00"), due: 5 });
  });

  it("reminds on the phone's evening when that is already the next review day", () => {
    // 23:30 in Tallinn on 12 October is 13 October in Tokyo.
    const plan = planReminders({
      time: "23:30",
      now: morning,
      zone: "Asia/Tokyo",
      left: 0,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 0, "2026-10-13": 5 }),
    });
    expect(plan[0]).toEqual({ at: at("2026-10-12T23:30:00"), due: 5 });
  });
});

describe("lineFor", () => {
  it("changes from one day to the next", () => {
    expect(lineFor(at("2026-10-12T19:00:00"), 3)).not.toBe(lineFor(at("2026-10-13T19:00:00"), 3));
  });
});

describe("forecastFrom", () => {
  const today = "2026-10-12";

  it("keeps each count on its review date", () => {
    const buckets = [
      { date: "2026-10-12", count: 4 },
      { date: "2026-10-13", count: 6 },
      { date: "2026-10-15", count: 2 },
    ];
    expect(forecastFrom(buckets, today)).toEqual(
      byDay({ "2026-10-12": 4, "2026-10-13": 6, "2026-10-15": 2 }),
    );
  });

  it("drops a forecast fetched on an earlier day", () => {
    const yesterday = [
      { date: "2026-10-11", count: 9 },
      { date: "2026-10-12", count: 5 },
    ];
    expect(forecastFrom(yesterday, today)).toBeUndefined();
  });

  it("drops a forecast until the learner's day is known", () => {
    expect(forecastFrom([{ date: today, count: 1 }], undefined)).toBeUndefined();
  });

  it("plans no phantom reminder from yesterday's forecast", () => {
    const yesterday = [
      { date: "2026-10-11", count: 9 },
      { date: "2026-10-12", count: 0 },
      { date: "2026-10-13", count: 7 },
    ];
    const plan = planReminders({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 0,
      dayDone: true,
      forecast: forecastFrom(yesterday, today),
    });
    expect(plan).toEqual([]);
  });
});

describe("gradeRevision", () => {
  const graded = { cardId: "a", reviewedAt: "2026-10-12T09:00:00Z" };

  it("leaves out grades still queued offline", () => {
    expect(gradeRevision([{ ...graded }])).toBe("");
    expect(gradeRevision([{ ...graded, sentAt: 1 }])).not.toBe("");
  });

  it("moves when a queued grade lands", () => {
    const first = { ...graded, sentAt: 1 };
    const second = { cardId: "b", reviewedAt: "2026-10-12T09:01:00Z" };
    expect(gradeRevision([first, { ...second, sentAt: 2 }])).not.toBe(
      gradeRevision([first, second]),
    );
  });

  it("moves when an Undo takes back the only grade, down to none", () => {
    const before = gradeRevision([{ ...graded, sentAt: 1 }]);
    expect(gradeRevision([{ ...graded, sentAt: 1, undone: true }])).not.toBe(before);
    expect(gradeRevision([])).not.toBe(before);
  });
});

describe("replans", () => {
  it("keeps the planned reminders while the forecast is from an earlier day", () => {
    expect(replans(true, 0, true)).toBe(false);
  });

  it("waits for today's count", () => {
    expect(replans(true, undefined, false)).toBe(false);
  });

  it("plans once the count and a forecast dated today are in", () => {
    expect(replans(true, 0, false)).toBe(true);
  });

  it("always clears when the reminder is turned off", () => {
    expect(replans(false, undefined, true)).toBe(true);
  });
});
