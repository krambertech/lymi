import type { StreakDay } from "@lymi/core";
import { describe, expect, it } from "vitest";
import {
  DAYS_AHEAD,
  forecastFrom,
  type PlannedReminder,
  type PlanReports,
  planReminders,
  replans,
  reportPlan,
} from "./plan";

// The phone's clock in these cases; Node applies a TZ set at run time.
process.env.TZ = "Europe/Tallinn";
const PHONE = "Europe/Tallinn";

const at = (iso: string) => new Date(iso);
const morning = at("2026-10-12T09:00:00");
const byDay = (counts: Record<string, number>) => new Map(Object.entries(counts));
const plan = (
  input: Omit<Parameters<typeof planReminders>[0], "goal" | "days"> & {
    days?: StreakDay[];
  },
) => planReminders({ goal: 25, days: [], ...input });
const ready = (when: string, count: number) => ({
  at: at(when),
  due: count,
  message: "ready",
  count,
});
const met = (date: string): StreakDay => ({
  date,
  attempts: 25,
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

describe("planReminders", () => {
  it("reminds today and each day after while cards are left", () => {
    const planned = plan({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 13,
      dayDone: false,
    });
    expect(planned).toHaveLength(DAYS_AHEAD);
    expect(planned[0]).toEqual(ready("2026-10-12T19:00:00", 13));
    expect(planned[1]).toEqual(ready("2026-10-13T19:00:00", 13));
  });

  it("skips today once the day counts, and carries what is left", () => {
    const planned = plan({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 4,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 4, "2026-10-13": 6 }),
    });
    expect(planned[0]).toEqual(ready("2026-10-13T19:00:00", 10));
    expect(planned[1]).toEqual(ready("2026-10-14T19:00:00", 10));
  });

  it("stays quiet on days with nothing due", () => {
    const planned = plan({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 0,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 0, "2026-10-14": 3 }),
    });
    expect(planned[0]).toEqual(ready("2026-10-14T19:00:00", 3));
  });

  it("schedules nothing when nothing is due and there is no forecast", () => {
    expect(plan({ time: "19:00", now: morning, zone: PHONE, left: 0, dayDone: true })).toEqual([]);
  });

  it("leaves today out once its time has passed", () => {
    const planned = plan({
      time: "08:30",
      now: morning,
      zone: PHONE,
      left: 2,
      dayDone: false,
    });
    expect(planned[0]?.at).toEqual(at("2026-10-13T08:30:00"));
  });

  it("moves today's reminder to the hour the learner put it off to", () => {
    const planned = plan({
      time: "08:30",
      now: morning,
      zone: PHONE,
      left: 2,
      dayDone: false,
      snoozedUntil: at("2026-10-12T10:00:00"),
    });
    expect(planned[0]).toEqual(ready("2026-10-12T10:00:00", 2));
  });

  it("drops a put-off reminder once the day counts", () => {
    const planned = plan({
      time: "08:30",
      now: morning,
      zone: PHONE,
      left: 2,
      dayDone: true,
      snoozedUntil: at("2026-10-12T10:00:00"),
    });
    expect(planned[0]?.at).toEqual(at("2026-10-13T08:30:00"));
  });

  it("counts each reminder by the review day it falls on when the review zone runs behind", () => {
    // 09:00 on 13 October in Tallinn is still 12 October in Los Angeles, where the learner reviews.
    const planned = plan({
      time: "09:00",
      now: at("2026-10-13T08:00:00"),
      zone: "America/Los_Angeles",
      left: 0,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 0, "2026-10-13": 5 }),
    });
    // The first reminder on the phone's 13 October is still the review day that counts, so it
    // waits for 14 October's 09:00, which is 13 October in Los Angeles, with its five cards.
    expect(planned[0]).toEqual(ready("2026-10-14T09:00:00", 5));
  });

  it("reminds on the phone's evening when that is already the next review day", () => {
    // 23:30 in Tallinn on 12 October is 13 October in Tokyo.
    const planned = plan({
      time: "23:30",
      now: morning,
      zone: "Asia/Tokyo",
      left: 0,
      dayDone: true,
      forecast: byDay({ "2026-10-12": 0, "2026-10-13": 5 }),
    });
    expect(planned[0]).toEqual(ready("2026-10-12T23:30:00", 5));
  });
});

describe("reportPlan", () => {
  const now = at("2026-10-12T09:00:00");
  const plan: PlannedReminder[] = [
    { at: at("2026-10-14T19:00:00"), due: 3, message: "ready", count: 3 },
    { at: at("2026-10-15T19:00:00"), due: 30, message: "ready", count: 30 },
  ];
  const nextAt = at("2026-10-14T19:00:00").getTime();

  function log() {
    let reported: number | undefined;
    const sent: Parameters<PlanReports["send"]>[0][] = [];
    const delivery = { works: true };
    const reports: PlanReports = {
      reported: () => reported,
      remember: (value) => {
        reported = value;
      },
      send: (report) => {
        if (delivery.works) sent.push(report);
        return delivery.works;
      },
    };
    return { reports, sent, delivery, reported: () => reported };
  }

  it("says how far off the next reminder is, how many are planned and what it will count", () => {
    const { reports, sent, reported } = log();
    reportPlan(plan, now, reports);
    expect(sent).toEqual([{ backlog: "1-20", reminders: 2, days_ahead: 2 }]);
    expect(reported()).toBe(nextAt);
  });

  it("counts a reminder later today as no days ahead", () => {
    const { reports, sent } = log();
    reportPlan(
      [{ ...plan[0], at: at("2026-10-12T19:00:00"), due: 1 } as PlannedReminder],
      now,
      reports,
    );
    expect(sent[0]).toMatchObject({ days_ahead: 0 });
  });

  it("stays quiet until the next reminder moves", () => {
    const { reports, sent } = log();
    reportPlan(plan, now, reports);
    reportPlan(plan, now, reports);
    expect(sent).toHaveLength(1);
    reportPlan(plan.slice(1), now, reports);
    expect(sent).toHaveLength(2);
  });

  it("tries again with the next plan when the event could not go", () => {
    const { reports, sent, delivery, reported } = log();
    delivery.works = false;
    reportPlan(plan, now, reports);
    expect(reported()).toBeUndefined();
    delivery.works = true;
    reportPlan(plan, now, reports);
    expect(sent).toHaveLength(1);
  });

  it("keeps the report through an empty plan, which a stale forecast can make for a moment", () => {
    const { reports, sent, reported } = log();
    reportPlan(plan, now, reports);
    reportPlan([], now, reports);
    expect(reported()).toBe(nextAt);
    reportPlan(plan, now, reports);
    expect(sent).toHaveLength(1);
  });
});

describe("each reminder's message", () => {
  const plannedFor = (days: StreakDay[], left: number, dayDone = false) =>
    plan({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left,
      dayDone,
      days,
      forecast: byDay({ "2026-10-13": 2 }),
    }).map((r) => [r.at.getDate(), r.message, r.count]);

  it("counts toward the goal today, then expects a short today to be a rest day", () => {
    const days = [met("2026-10-10"), met("2026-10-11"), short("2026-10-12", 19)];
    const planned = plannedFor(days, 40);
    expect(planned[0]).toEqual([12, "to_goal", 6]);
    expect(planned[1]).toEqual([13, "after_rest", 42]);
    expect(planned[2]).toEqual([14, "ready", 42]);
  });

  it("moves the rest day on when today's goal is met", () => {
    const days = [met("2026-10-10"), met("2026-10-11"), met("2026-10-12")];
    const planned = plannedFor(days, 40, true);
    expect(planned[0]).toEqual([13, "ready", 42]);
    expect(planned[1]).toEqual([14, "after_rest", 42]);
    expect(planned[2]).toEqual([15, "ready", 42]);
  });

  it("says yesterday was a rest day this morning", () => {
    const planned = plannedFor([met("2026-10-09"), met("2026-10-10")], 12);
    expect(planned[0]).toEqual([12, "after_rest", 12]);
    expect(planned[1]).toEqual([13, "ready", 14]);
  });

  it("says the next cards are ready the day after a first review, and only then", () => {
    const planned = plannedFor([short("2026-10-12", 6)], 10);
    expect(planned[0]).toEqual([12, "to_goal", 10]);
    expect(planned[1]).toEqual([13, "next_cards", 12]);
    expect(planned[2]).toEqual([14, "ready", 12]);
  });

  it("stops a week ahead, however the messages fall", () => {
    const days = [met("2026-10-10"), met("2026-10-11")];
    expect(plannedFor(days, 10)).toHaveLength(DAYS_AHEAD);
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

  it("drops a forecast that starts after today", () => {
    expect(forecastFrom([{ date: "2026-10-13", count: 5 }], today)).toBeUndefined();
  });

  it("drops a forecast until the learner's day is known", () => {
    expect(forecastFrom([{ date: today, count: 1 }], undefined)).toBeUndefined();
  });

  it("plans later days from yesterday's forecast by date, and today from the live count", () => {
    const yesterday = [
      { date: "2026-10-11", count: 9 },
      { date: "2026-10-12", count: 4 },
      { date: "2026-10-13", count: 7 },
    ];
    const planned = plan({
      time: "19:00",
      now: morning,
      zone: PHONE,
      left: 0,
      dayDone: true,
      forecast: forecastFrom(yesterday, today),
    });
    expect(planned[0]).toEqual(ready("2026-10-13T19:00:00", 7));
    expect(planned[1]).toEqual(ready("2026-10-14T19:00:00", 7));
  });
});

describe("replans", () => {
  it("waits for today's count", () => {
    expect(replans(true, undefined)).toBe(false);
  });

  it("plans once today's count is in", () => {
    expect(replans(true, 0)).toBe(true);
  });

  it("always clears when the reminder is turned off", () => {
    expect(replans(false, undefined)).toBe(true);
  });
});
