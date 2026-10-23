import {
  legFinish,
  type RoundAsk,
  type RoundFetch,
  reviewEnd,
  roundWalk,
} from "@lymi/client/review-end";
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

describe("a round's end", () => {
  // A Today round walked to its last card while the day's draw still holds cards it has not refetched.
  const roundEnd = reviewEnd({
    stretch: "list",
    ending: "empty",
    goal: 10,
    from: 0,
    attempts: 3,
    satisfiedBefore: false,
    left: 12,
    confirmed: false,
    elsewhere: 0,
    forgotten: 0,
  });
  const round = (over: Partial<ReviewLeg>) =>
    leg({ key: `${DATE}:list:0`, scope: "round", count: 3, ...over });

  it("reports a walked round finished, and leaving it afterwards reports nothing more", () => {
    legs.step(round({ done: 0 }));
    legs.step(round({ done: 3 }));
    legs.step(
      round({
        done: 3,
        presenting: false,
        stopped: true,
        finished: legFinish(roundEnd, "empty", { stretch: "list", walked: true }),
      }),
    );
    legs.leave();
    expect(events.map((e) => e.name)).toEqual(["review_session_finished"]);
    expect(events).toMatchObject([{ card_count: 3, ending: "empty", scope: "round" }]);
  });

  describe("longer than one page", () => {
    // The phone loads a round 50 cards at a time; this one holds 80.
    const SIZE = 80;
    const long = (over: Partial<ReviewLeg>) => round({ count: SIZE, ...over });
    // The end the screen works out once the page in hand runs out, with the draw even confirmed.
    const pageEnd = (graded: number) =>
      long({
        done: graded,
        presenting: false,
        stopped: true,
        finished: legFinish(roundEnd, "empty", { stretch: "list", walked: graded >= SIZE }),
      });
    const walk = (from: number, to: number) => {
      for (let done = from; done < to; done++) legs.step(long({ done }));
    };

    it("is not finished when the first page runs out while the next loads", () => {
      walk(0, 50);
      legs.step(pageEnd(50));
      expect(events).toEqual([]);
    });

    it("is finished once every card in the round is graded or dropped, and only once", () => {
      walk(0, 50);
      legs.step(pageEnd(50));
      // The next page lands under the same key and is walked to the end.
      walk(50, SIZE);
      legs.step(pageEnd(SIZE));
      legs.step(pageEnd(SIZE));
      legs.leave();
      expect(events.map((e) => e.name)).toEqual(["review_session_finished"]);
      expect(events).toMatchObject([{ card_count: SIZE, ending: "empty", scope: "round" }]);
    });

    it("is not finished when the next page fails offline, and leaving reports it abandoned", () => {
      walk(0, 50);
      legs.step(pageEnd(50));
      legs.leave();
      expect(events).toMatchObject([
        {
          name: "review_session_abandoned",
          reason: "navigation",
          scope: "round",
          cards_done: 50,
          card_count: SIZE,
        },
      ]);
    });

    it("sends no second finish when a card comes back after the round's end", () => {
      walk(0, SIZE);
      legs.step(pageEnd(SIZE));
      // Undo brings the last card back, and it is graded again.
      legs.step(long({ done: SIZE - 1 }));
      legs.step(pageEnd(SIZE));
      legs.leave();
      expect(events.map((e) => e.name)).toEqual(["review_session_finished"]);
    });
  });

  describe("when a card leaves it partway", () => {
    // An 80-card round, one card of which is archived on another device, so the server sends 79.
    const SIZE = 80;
    const long = (over: Partial<ReviewLeg>) => round({ count: SIZE, ...over });
    let ask: RoundAsk | null;
    let fetch: RoundFetch;
    let refetches: number;
    let skeleton: boolean;
    beforeEach(() => {
      ask = null;
      fetch = { updatedAt: 1, idle: true, failed: false };
      refetches = 0;
      skeleton = false;
    });
    // One render of the screen with no card in hand, as review.tsx works it out, refetching as asked.
    const render = (done: number) => {
      const r = roundWalk({ size: SIZE, done, left: 0, ask, fetch });
      if (r.refetch) {
        ask = { at: fetch.updatedAt, done };
        refetches++;
        fetch = { ...fetch, idle: false };
      }
      skeleton = r.owed;
      legs.step(
        long({
          done,
          presenting: false,
          stopped: true,
          // The end waits on the skeleton while the round is owed.
          finished: r.owed
            ? null
            : legFinish(roundEnd, "empty", { stretch: "list", walked: r.walked }),
        }),
      );
    };
    const land = (ok = true) => {
      fetch = { updatedAt: fetch.updatedAt + 1, idle: true, failed: !ok };
    };
    const walk = (from: number, to: number) => {
      for (let done = from; done < to; done++) legs.step(long({ done }));
    };

    it("stops waiting once the refetch has nothing left, and reports it finished once", () => {
      walk(0, 50);
      render(50);
      land(); // The next page brings the 29 cards still in the round.
      walk(50, 79);
      render(79);
      expect(skeleton).toBe(true);
      land(); // Nothing left: the archived card never comes back.
      for (let i = 0; i < 20; i++) render(79);
      expect(skeleton).toBe(false);
      expect(refetches).toBe(2);
      legs.leave();
      expect(events.map((e) => e.name)).toEqual(["review_session_finished"]);
      expect(events).toMatchObject([{ card_count: 79, ending: "empty", scope: "round" }]);
    });

    it("is not finished when that refetch fails, and leaving reports it abandoned", () => {
      walk(0, 79);
      render(79);
      land(false);
      for (let i = 0; i < 20; i++) render(79);
      expect(skeleton).toBe(false);
      expect(refetches).toBe(1);
      legs.leave();
      expect(events).toMatchObject([{ name: "review_session_abandoned", cards_done: 79 }]);
    });
  });

  it("still reports a round left partway as abandoned", () => {
    legs.step(round({ done: 0 }));
    legs.step(round({ done: 1 }));
    legs.leave();
    expect(events).toMatchObject([
      { name: "review_session_abandoned", reason: "navigation", scope: "round", cards_done: 1 },
    ]);
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
