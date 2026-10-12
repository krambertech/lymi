import { describe, expect, it } from "vitest";
import { DAYS_AHEAD, forecastFrom, landedGrades, lineFor, planReminders } from "./plan";

const at = (iso: string) => new Date(iso);
const morning = at("2026-10-12T09:00:00");

describe("planReminders", () => {
  it("reminds today and each day after while cards are left", () => {
    const plan = planReminders({ time: "19:00", now: morning, left: 13, dayDone: false });
    expect(plan).toHaveLength(DAYS_AHEAD);
    expect(plan[0]).toEqual({ at: at("2026-10-12T19:00:00"), due: 13 });
    expect(plan[1]).toEqual({ at: at("2026-10-13T19:00:00"), due: 13 });
  });

  it("skips today once the day counts, and carries what is left", () => {
    const plan = planReminders({
      time: "19:00",
      now: morning,
      left: 4,
      dayDone: true,
      forecast: [4, 6, 0],
    });
    expect(plan[0]).toEqual({ at: at("2026-10-13T19:00:00"), due: 10 });
    expect(plan[1]).toEqual({ at: at("2026-10-14T19:00:00"), due: 10 });
  });

  it("stays quiet on days with nothing due", () => {
    const plan = planReminders({
      time: "19:00",
      now: morning,
      left: 0,
      dayDone: true,
      forecast: [0, 0, 3],
    });
    expect(plan[0]).toEqual({ at: at("2026-10-14T19:00:00"), due: 3 });
  });

  it("schedules nothing when nothing is due and there is no forecast", () => {
    expect(planReminders({ time: "19:00", now: morning, left: 0, dayDone: true })).toEqual([]);
  });

  it("leaves today out once its time has passed", () => {
    const plan = planReminders({
      time: "08:30",
      now: morning,
      left: 2,
      dayDone: false,
    });
    expect(plan[0]?.at).toEqual(at("2026-10-13T08:30:00"));
  });

  it("moves today's reminder to the hour the learner put it off to", () => {
    const plan = planReminders({
      time: "08:30",
      now: morning,
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
      left: 2,
      dayDone: true,
      snoozedUntil: at("2026-10-12T10:00:00"),
    });
    expect(plan[0]?.at).toEqual(at("2026-10-13T08:30:00"));
  });
});

describe("lineFor", () => {
  it("changes from one day to the next", () => {
    expect(lineFor(at("2026-10-12T19:00:00"), 3)).not.toBe(lineFor(at("2026-10-13T19:00:00"), 3));
  });
});

describe("forecastFrom", () => {
  const today = "2026-10-12";

  it("counts each day by its date, with a day the forecast skips as zero", () => {
    const buckets = [
      { date: "2026-10-12", count: 4 },
      { date: "2026-10-13", count: 6 },
      { date: "2026-10-15", count: 2 },
    ];
    expect(forecastFrom(buckets, today)).toEqual([4, 6, 0, 2, 0, 0, 0]);
  });

  it("drops a forecast fetched on an earlier day", () => {
    const yesterday = [
      { date: "2026-10-11", count: 9 },
      { date: "2026-10-12", count: 5 },
      { date: "2026-10-13", count: 7 },
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
      left: 0,
      dayDone: true,
      forecast: forecastFrom(yesterday, today),
    });
    expect(plan).toEqual([]);
  });
});

describe("landedGrades", () => {
  it("counts grades the server took in or that were taken back, not those queued offline", () => {
    expect(landedGrades([{ sentAt: 1 }, {}, { undone: true }, {}])).toBe(2);
  });

  it("moves when a queued grade lands, so the forecast refreshes then", () => {
    const queued = [{ sentAt: 1 }, {}];
    const replayed = [{ sentAt: 1 }, { sentAt: 2 }];
    expect(landedGrades(replayed)).toBeGreaterThan(landedGrades(queued));
  });
});
