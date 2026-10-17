import type { ProductAnalyticsEvent } from "@lymi/core/analytics";
import { beforeEach, describe, expect, it } from "vitest";
import { daysBefore, type ReviewLeg, ReviewLegs } from "./review-legs";

const DATE = "2026-10-12";
const NEW_LEARNER = { reviewedDays: 0, today: { date: DATE, attempts: 0 } };

let events: ProductAnalyticsEvent[];
let legs: ReviewLegs;

const leg = (over: Partial<ReviewLeg>): ReviewLeg => ({
  key: `${DATE}:draw:0`,
  date: DATE,
  scope: "day",
  before: 0,
  done: 0,
  count: 10,
  presenting: true,
  stopped: false,
  paused: false,
  finished: null,
  ...over,
});

beforeEach(() => {
  events = [];
  let n = 0;
  legs = new ReviewLegs(
    (event) => events.push(event),
    () => `leg-${++n}`,
  );
});

describe("review legs on the phone", () => {
  it("counts every grade when the streak lands after the first ones", () => {
    legs.step(leg({ done: 0 }));
    legs.step(leg({ done: 1 }));
    legs.step(leg({ done: 2 }));
    legs.setStreak({ reviewedDays: 1, today: { date: DATE, attempts: 2 } });
    legs.step(leg({ done: 3 }));
    legs.step(leg({ done: 10, presenting: false, stopped: true, finished: "goal" }));
    expect(events).toEqual([
      {
        name: "review_session_finished",
        session_id: "leg-1",
        card_count: 10,
        is_first_session: true,
        ending: "goal",
        scope: "day",
      },
    ]);
  });

  it("says a review of chosen cards was one", () => {
    legs.step(leg({ key: `${DATE}:list:0`, scope: "chosen", done: 0, count: 3 }));
    legs.step(leg({ key: `${DATE}:list:0`, scope: "chosen", done: 1, count: 3 }));
    legs.step(
      leg({
        key: `${DATE}:list:0`,
        scope: "chosen",
        done: 1,
        count: 3,
        presenting: false,
        stopped: true,
        paused: true,
      }),
    );
    expect(events).toMatchObject([
      { name: "review_session_abandoned", reason: "left", scope: "chosen", cards_done: 1 },
    ]);
  });

  it("reports a leg under the scope it ran in when the next leg starts", () => {
    legs.step(leg({ scope: "filtered", done: 0 }));
    legs.step(leg({ scope: "filtered", done: 3 }));
    legs.step(leg({ key: `${DATE}:forgotten:3`, scope: "round", done: 0 }));
    legs.leave();
    expect(events).toMatchObject([
      { name: "review_session_abandoned", cards_done: 3, scope: "filtered" },
      { name: "review_session_abandoned", cards_done: 0, scope: "round" },
    ]);
  });

  it("reports a leg finished before the streak lands, without claiming a first session", () => {
    legs.step(leg({ done: 0 }));
    legs.step(leg({ done: 10, presenting: false, stopped: true, finished: "goal" }));
    expect(events).toMatchObject([
      { name: "review_session_finished", card_count: 10, is_first_session: false },
    ]);
  });

  it("reports a leg left while the streak never loads", () => {
    legs.step(leg({ done: 0 }));
    legs.step(leg({ done: 4 }));
    legs.leave();
    expect(events).toMatchObject([
      {
        name: "review_session_abandoned",
        cards_done: 4,
        card_count: 10,
        is_first_session: false,
        reason: "navigation",
      },
    ]);
  });

  it("is a first session only when nothing was reviewed before it", () => {
    legs.setStreak(NEW_LEARNER);
    legs.step(leg({ done: 0 }));
    legs.step(leg({ done: 5, presenting: false, stopped: true, finished: "goal" }));
    legs.step(leg({ key: `${DATE}:draw:5`, before: 5, done: 0 }));
    legs.step(
      leg({
        key: `${DATE}:draw:5`,
        before: 5,
        done: 2,
        presenting: false,
        stopped: true,
        paused: true,
      }),
    );
    expect(events.map((e) => "is_first_session" in e && e.is_first_session)).toEqual([true, false]);
  });

  it("is not a first session after reviews earlier today or on an earlier day", () => {
    legs.setStreak({ reviewedDays: 3, today: { date: DATE, attempts: 0 } });
    legs.step(leg({ done: 0 }));
    legs.step(leg({ done: 1, presenting: false, stopped: true, finished: "goal" }));
    expect(events).toMatchObject([{ is_first_session: false }]);
  });
});

describe("days reviewed before a leg", () => {
  it("leaves out today, which the leg's own grades may have added", () => {
    expect(daysBefore({ reviewedDays: 1, today: { date: DATE, attempts: 3 } }, DATE)).toBe(0);
    expect(daysBefore({ reviewedDays: 2, today: { date: DATE, attempts: 3 } }, DATE)).toBe(1);
  });

  it("trusts an older read only to prove an earlier review", () => {
    expect(daysBefore({ reviewedDays: 2, today: { date: "2026-10-11", attempts: 0 } }, DATE)).toBe(
      2,
    );
    expect(
      daysBefore({ reviewedDays: 0, today: { date: "2026-10-11", attempts: 0 } }, DATE),
    ).toBeUndefined();
  });
});
