import type { Rating, ReviewMode, StreakOut } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { Card, Draw } from "./api";
import {
  dayOutcome,
  EXTRA_ROUND,
  forgottenRound,
  nextRoundSize,
  streakWith,
} from "./review-complete";
import { drawState, type LocalGrade } from "./review-draw";

const DAY = 86_400_000;
const start = new Date("2026-09-13T00:00:00Z");
const noon = new Date("2026-09-13T12:00:00Z");
const M: ReviewMode = { cue: "meaning", target: "term" };
const ago = (days: number) => new Date(start.getTime() - days * DAY).toISOString();
const next = { 1: ago(0), 2: ago(0), 3: ago(0), 4: ago(0) };

const card = (id: string, deckId = "a") => ({
  card: { id, deckId, term: id } as Card,
  modes: [
    {
      mode: M,
      stateId: `s-${id}`,
      fsrsState: 2,
      due: ago(1),
      retrievability: 0.6,
      added: ago(30),
      hasCue: true,
      next,
    },
  ],
});

const data = (n: number, deckOf: (i: number) => string = () => "a"): Draw => ({
  day: {
    date: "2026-09-13",
    zone: "UTC",
    start: start.toISOString(),
    end: new Date(start.getTime() + DAY).toISOString(),
  },
  goal: 5,
  attempts: 0,
  total: n,
  cards: Array.from({ length: n }, (_, i) => card(`c${i}`, deckOf(i))),
  log: [],
});

/** Grades whatever the draw serves, `n` times. */
function play(d: Draw, n: number, ratingOf: (i: number) => Rating = () => 3) {
  const grades: LocalGrade[] = [];
  for (let i = 0; i < n; i++) {
    const s = drawState(d, grades, noon, undefined);
    if (!s.next) break;
    grades.push({
      cardId: s.next.cardId,
      mode: M,
      rating: ratingOf(i),
      reviewedAt: new Date(noon.getTime() + (i + 1) * 1000).toISOString(),
      stateBefore: 2,
    });
  }
  return drawState(d, grades, new Date(noon.getTime() + 3_600_000), undefined);
}

const summary = (over: Partial<StreakOut> & { outcome?: StreakOut["today"]["outcome"] } = {}) => {
  const { outcome = "open", ...rest } = over;
  return {
    today: { date: "2026-09-13", attempts: 4, goal: 5, outcome },
    goal: 5,
    current: 3,
    longest: 3,
    reviewedDays: 10,
    days: [{ date: "2026-09-13", attempts: 4, goal: 5, satisfied: false, nothingDue: false }],
    ...rest,
  } satisfies StreakOut;
};

describe("the day's outcome", () => {
  it("is the goal at the goal's attempt, whatever came before", () => {
    expect(dayOutcome(5, 5)).toBe("goal_met");
    expect(dayOutcome(12, 5)).toBe("goal_met");
  });

  it("is the lot below the goal, and nothing due with no attempts", () => {
    expect(dayOutcome(3, 5)).toBe("exhausted");
    expect(dayOutcome(0, 5)).toBe("nothing_due");
  });
});

describe("the streak once today counts", () => {
  it("adds today to the run and fills today's light", () => {
    const after = streakWith(summary(), 5, true);
    expect(after.current).toBe(4);
    expect(after.longest).toBe(4);
    expect(after.today).toMatchObject({ attempts: 5, outcome: "goal_met" });
    expect(after.days.at(-1)).toMatchObject({ attempts: 5, satisfied: true });
  });

  it("never adds today twice once the server already counts it", () => {
    const after = streakWith(summary({ outcome: "goal_met", current: 4 }), 15, true);
    expect(after.current).toBe(4);
    expect(after.today.attempts).toBe(15);
  });

  it("keeps an unfinished day open, only moving its count", () => {
    const after = streakWith(summary(), 4, false);
    expect(after.current).toBe(3);
    expect(after.today.outcome).toBe("open");
  });

  it("lists today when it had no attempts before", () => {
    const after = streakWith(summary({ days: [] }), 2, true);
    expect(after.today.outcome).toBe("exhausted");
    expect(after.days).toEqual([
      { date: "2026-09-13", attempts: 2, goal: 5, satisfied: true, nothingDue: false },
    ]);
  });
});

describe("what the end of a review offers", () => {
  it("Review forgotten holds each card whose latest grade today is Forgot, once", () => {
    const d = data(12);
    const state = play(d, 8, (i) => (i < 2 ? 1 : 3));
    const forgotten = state.log.filter((e) => e.rating === 1).map((e) => e.cardId);
    const latest = new Map(state.log.map((e) => [e.cardId, e.rating]));
    const expected = [...new Set(forgotten)].filter((id) => latest.get(id) === 1);
    expect(forgottenRound(d, state).map((r) => r.cardId)).toEqual(expected);
  });

  it("another round is ten attempts, or fewer when the draw runs out", () => {
    const plenty = data(30);
    expect(nextRoundSize(plenty, play(plenty, 5))).toBe(EXTRA_ROUND);
    const few = data(8);
    expect(nextRoundSize(few, play(few, 5))).toBe(3);
    expect(nextRoundSize(few, play(few, 8))).toBe(0);
  });

  it("follows the deck the review is in", () => {
    const d = data(12, (i) => (i < 2 ? "b" : "a"));
    expect(nextRoundSize(d, play(d, 0), "b")).toBe(2);
  });
});
