import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  deserializeState,
  emptyState,
  type FsrsCard,
  interval,
  preview,
  State,
  schedule,
  serializeState,
} from "./fsrs";
import type { Rating } from "./types";

const DAY_MS = 86_400_000;
const START = new Date("2026-01-01T00:00:00Z").getTime();

const rating = fc.constantFrom<Rating>(1, 2, 3, 4);

/** One grade and how long after the previous one it came: a second to a year and a half. */
const grade = fc.record({ rating, gap: fc.integer({ min: 1000, max: 540 * DAY_MS }) });

/** A grade history as the server accepts it: each grade strictly after the last one. */
const history = fc.array(grade, { minLength: 1, maxLength: 30 });

function replay(grades: { rating: Rating; gap: number }[]): { card: FsrsCard; at: number }[] {
  let card = emptyState(new Date(START));
  let at = START;
  const states: { card: FsrsCard; at: number }[] = [];
  for (const step of grades) {
    at += step.gap;
    card = schedule(card, step.rating, new Date(at)).card;
    states.push({ card, at });
  }
  return states;
}

describe("fsrs properties", () => {
  it("schedules every grade into the future with a readable memory state", () => {
    fc.assert(
      fc.property(history, (grades) => {
        for (const { card, at } of replay(grades)) {
          expect(card.due.getTime()).toBeGreaterThan(at);
          expect(card.last_review?.getTime()).toBe(at);
          expect(card.state).not.toBe(State.New);
          expect(Number.isFinite(card.stability)).toBe(true);
          expect(card.stability).toBeGreaterThan(0);
          expect(card.difficulty).toBeGreaterThanOrEqual(1);
          expect(card.difficulty).toBeLessThanOrEqual(10);
        }
      }),
    );
  });

  it("orders the grade buttons Forgot, Hard, Good, Easy for any card at any later moment", () => {
    fc.assert(
      fc.property(history, fc.integer({ min: 0, max: 540 * DAY_MS }), (grades, wait) => {
        const last = replay(grades).at(-1);
        if (!last) return;
        const p = preview(last.card, new Date(last.at + wait));
        expect(p[1].getTime()).toBeLessThanOrEqual(p[2].getTime());
        expect(p[2].getTime()).toBeLessThan(p[3].getTime());
        expect(p[3].getTime()).toBeLessThanOrEqual(p[4].getTime());
        // ts-fsrs can give Good and Easy the same day for a card still in learning.
        if (last.card.state === State.Review) expect(p[3].getTime()).toBeLessThan(p[4].getTime());
      }),
    );
  });

  it("stores and reads back any reachable state unchanged", () => {
    fc.assert(
      fc.property(history, (grades) => {
        for (const { card } of replay(grades)) {
          expect(deserializeState(serializeState(card))).toEqual(card);
        }
      }),
    );
  });

  it("never shows a shorter interval for a longer wait", () => {
    const rank = { minute: 0, hour: 1, day: 2, month: 3, year: 4 } as const;
    const span = fc.integer({ min: -DAY_MS, max: 20 * 365 * DAY_MS });
    fc.assert(
      fc.property(span, span, (a, b) => {
        const [short, long] = a <= b ? [a, b] : [b, a];
        const from = new Date(START);
        const x = interval(from, new Date(START + short));
        const y = interval(from, new Date(START + long));
        expect(x.value).toBeGreaterThanOrEqual(1);
        expect(rank[x.unit]).toBeLessThanOrEqual(rank[y.unit]);
        if (x.unit === y.unit) expect(x.value).toBeLessThanOrEqual(y.value);
      }),
    );
  });
});
