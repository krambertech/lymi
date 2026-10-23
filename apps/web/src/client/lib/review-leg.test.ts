import {
  legFinish,
  type RoundAsk,
  type RoundFetch,
  reviewEnd,
  roundWalk,
} from "@lymi/client/review-end";
import type { ProductAnalyticsEvent } from "@lymi/core/analytics";
import { ReviewSessionTracker } from "@lymi/core/analytics-review-session";
import { beforeEach, describe, expect, it } from "vitest";
import { stepReviewLeg } from "./review-leg";

// An 80-card round, one card of which is archived on another device, so the server sends 79.
const SIZE = 80;
const KEY = "2026-10-12:today:0";
// A round's end while the day's draw still holds cards it has not refetched.
const roundEnd = reviewEnd({
  stretch: "list",
  ending: "empty",
  goal: 10,
  from: 0,
  attempts: 79,
  satisfiedBefore: true,
  left: 12,
  confirmed: false,
  elsewhere: 0,
  forgotten: 0,
});

let events: ProductAnalyticsEvent[];
let tracker: ReviewSessionTracker;
let ask: RoundAsk | null;
let fetch: RoundFetch;
let refetches: number;
let waiting: boolean;

beforeEach(() => {
  events = [];
  tracker = new ReviewSessionTracker(
    (event) => events.push(event),
    () => "leg-1",
  );
  ask = null;
  fetch = { updatedAt: 1, idle: true, failed: false };
  refetches = 0;
  waiting = false;
});

const snapshot = (done: number) => ({
  cardsDone: done,
  cardCount: SIZE,
  first: false,
  scope: "round" as const,
});
const walk = (from: number, to: number) => {
  for (let done = from; done < to; done++)
    stepReviewLeg(tracker, {
      key: KEY,
      snapshot: snapshot(done),
      presentedCount: SIZE,
      presenting: true,
      stopped: false,
      paused: false,
      finished: null,
    });
};
// One render of the review route with no card in hand, refetching the round as asked.
const render = (done: number) => {
  const r = roundWalk({ size: SIZE, done, left: 0, ask, fetch });
  if (r.refetch) {
    ask = { at: fetch.updatedAt, done };
    refetches++;
    fetch = { ...fetch, idle: false };
  }
  waiting = r.owed;
  stepReviewLeg(tracker, {
    key: KEY,
    snapshot: snapshot(done),
    presentedCount: SIZE,
    presenting: false,
    stopped: true,
    paused: false,
    finished: r.owed ? null : legFinish(roundEnd, "empty", { stretch: "list", walked: r.walked }),
  });
};
const land = (ok = true) => {
  fetch = { updatedAt: fetch.updatedAt + 1, idle: true, failed: !ok };
};

describe("a round on the web that loses a card partway", () => {
  it("is finished once the refetch has nothing left for it, and only once", () => {
    walk(0, 79);
    render(79);
    expect(waiting).toBe(true);
    land();
    for (let i = 0; i < 20; i++) render(79);
    expect(waiting).toBe(false);
    expect(refetches).toBe(1);
    tracker.abandon("navigation");
    expect(events.map((e) => e.name)).toEqual(["review_session_finished"]);
    expect(events).toMatchObject([{ card_count: 79, ending: "empty", scope: "round" }]);
  });

  it("goes on with the next page when the refetch brings more cards", () => {
    walk(0, 50);
    render(50);
    land();
    walk(50, 79);
    render(79);
    land();
    render(79);
    expect(refetches).toBe(2);
    expect(events.map((e) => e.name)).toEqual(["review_session_finished"]);
  });

  it("is not finished when the refetch fails, and leaving reports it abandoned", () => {
    walk(0, 79);
    render(79);
    land(false);
    for (let i = 0; i < 20; i++) render(79);
    expect(waiting).toBe(false);
    tracker.abandon("navigation");
    expect(events).toMatchObject([{ name: "review_session_abandoned", cards_done: 79 }]);
  });
});
