import { describe, expect, it } from "vitest";
import { DAYS_AHEAD, lineFor, planReminders } from "./plan";

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
