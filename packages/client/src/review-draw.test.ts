import {
  type Rating,
  RETURN_GAPS,
  RETURN_JITTER,
  type ReviewMode,
  SLIPPING_RETURN_GAP,
} from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { Card, Draw } from "./api";
import {
  currentDay,
  drawLog,
  drawState,
  type LocalGrade,
  reviewItem,
  stateBefore,
} from "./review-draw";

const DAY = 86_400_000;
const start = new Date("2026-09-13T00:00:00Z");
const end = new Date(start.getTime() + DAY);
const noon = new Date("2026-09-13T12:00:00Z");
const M: ReviewMode = { cue: "meaning", target: "term" };
const ago = (days: number) => new Date(start.getTime() - days * DAY).toISOString();
const next = {
  1: noon.toISOString(),
  2: noon.toISOString(),
  3: noon.toISOString(),
  4: noon.toISOString(),
};

function card(
  id: string,
  opts: {
    deckId?: string;
    state?: number;
    retrievability?: number;
    due?: string;
    slipping?: boolean;
  } = {},
) {
  return {
    card: { id, deckId: opts.deckId ?? "a", term: id } as Card,
    modes: [
      {
        mode: M,
        stateId: `s-${id}`,
        fsrsState: opts.state ?? 2,
        due: opts.due ?? ago(1),
        retrievability: opts.retrievability ?? 0.6,
        added: ago(30),
        hasCue: true,
        next,
      },
    ],
    slipping: opts.slipping ?? false,
  };
}

function data(cards: Draw["cards"], log: Draw["log"] = []): Draw {
  return {
    day: { date: "2026-09-13", zone: "UTC", start: start.toISOString(), end: end.toISOString() },
    goal: 20,
    attempts: log.length,
    total: cards.length,
    cards,
    log,
  };
}

let tick = 0;
function grade(cardId: string, rating: Rating, stateBefore?: number): LocalGrade {
  tick += 1;
  return {
    cardId,
    mode: M,
    rating,
    reviewedAt: new Date(noon.getTime() + tick * 1000).toISOString(),
    stateBefore,
  };
}

/** Grades whatever the draw serves, as the review screen does, and returns what it saw. */
function play(d: Draw, n: number, ratingOf: (cardId: string) => Rating, deckId?: string) {
  const grades: LocalGrade[] = [];
  const seen: { cardId: string; kind: string }[] = [];
  for (let i = 0; i < n; i++) {
    const s = drawState(d, grades, noon, deckId);
    if (!s.next) break;
    seen.push({ cardId: s.next.cardId, kind: s.next.kind });
    const before = stateBefore(d, s.log, s.next.cardId, M);
    grades.push(grade(s.next.cardId, ratingOf(s.next.cardId), before));
  }
  return { grades, seen };
}

const many = (n: number, deckId?: (i: number) => string) =>
  Array.from({ length: n }, (_, i) =>
    card(`r${i}`, { retrievability: 0.5 + i / (4 * n), ...(deckId ? { deckId: deckId(i) } : {}) }),
  );

describe("the log", () => {
  it("adds local grades the fetch lacks, once, in time order", () => {
    const fetched = grade("r0", 3, 2);
    const local = grade("r1", 1, 2);
    const d = data(many(3), [
      { cardId: fetched.cardId, mode: M, rating: 3, stateBefore: 2, at: fetched.reviewedAt },
    ]);
    const log = drawLog(d, [local, fetched], currentDay(d, noon));
    expect(log.map((e) => e.cardId)).toEqual(["r0", "r1"]);
  });

  it("leaves out a grade from before midnight", () => {
    const d = data(many(3));
    const late = {
      ...grade("r0", 3, 2),
      reviewedAt: new Date(start.getTime() - 60_000).toISOString(),
    };
    expect(drawLog(d, [late], currentDay(d, noon))).toEqual([]);
  });

  it("classifies a repeat of a missed mode as still learning", () => {
    const d = data([card("x", { state: 2 }), card("n", { state: 0 })]);
    const day = currentDay(d, noon);
    expect(stateBefore(d, [], "x", M)).toBe(2);
    const missedReview = drawLog(d, [grade("x", 1, 2)], day);
    expect(stateBefore(d, missedReview, "x", M)).toBe(3);
    const missedNew = drawLog(d, [grade("n", 2, 0)], day);
    expect(stateBefore(d, missedNew, "n", M)).toBe(1);
  });
});

describe("returns", () => {
  it("brings a forgotten card back after the expected attempts, and a fourth miss keeps it away", () => {
    const d = data([card("x", { retrievability: 0.99 }), ...many(80)]);
    const { seen } = play(d, 80, (id) => (id === "x" ? 1 : 3));
    const positions = seen.flatMap((s, i) => (s.cardId === "x" ? [i] : []));
    expect(positions).toHaveLength(4);
    positions.slice(1).forEach((at, i) => {
      const gap = at - (positions[i] as number) - 1;
      expect(Math.abs(gap - (RETURN_GAPS[i] as number))).toBeLessThanOrEqual(RETURN_JITTER);
    });
    expect(seen.slice(1 + (positions[3] as number)).some((s) => s.cardId === "x")).toBe(false);
  });

  it("brings an often-forgotten card back once, as the fetched draw flags it", () => {
    const d = data([card("x", { retrievability: 0.99, slipping: true }), ...many(30)]);
    const { seen } = play(d, 30, (id) => (id === "x" ? 1 : 3));
    const positions = seen.flatMap((s, i) => (s.cardId === "x" ? [i] : []));
    expect(positions).toHaveLength(2);
    const gap = (positions[1] as number) - (positions[0] as number) - 1;
    expect(Math.abs(gap - SLIPPING_RETURN_GAP)).toBeLessThanOrEqual(RETURN_JITTER);
  });

  it("serves a return missed in a deck review in the all-decks review", () => {
    const d = data([
      card("x", { deckId: "a", retrievability: 0.99 }),
      ...many(20, (i) => (i % 2 ? "a" : "b")),
    ]);
    let local = [grade("x", 1, 2)];
    for (let i = 0; i < 2; i++) {
      const s = drawState(d, local, noon, "a");
      if (s.next && s.next.cardId !== "x") local = [...local, grade(s.next.cardId, 3, 2)];
    }
    expect(drawState(d, local, noon, undefined).attempts).toBe(3);
    let found = false;
    for (let i = 0; i < 6 && !found; i++) {
      const s = drawState(d, local, noon, undefined);
      if (s.next?.cardId === "x") found = s.next.kind === "return";
      else if (s.next) local = [...local, grade(s.next.cardId, 3, 2)];
    }
    expect(found).toBe(true);
  });

  it("shows a returning card as relearning with no stale schedule", () => {
    const d = data([card("x", { state: 2 }), ...many(5)]);
    const log = drawLog(d, [grade("x", 1, 2)], currentDay(d, noon));
    const item = reviewItem(d, log, { cardId: "x", mode: "meaning_to_term" });
    expect(item?.fsrsState).toBe(3);
    expect(item?.next).toBeUndefined();
    expect(reviewItem(d, [], { cardId: "x", mode: "meaning_to_term" })?.next).toEqual(next);
  });
});

describe("reload and a grade taken back elsewhere", () => {
  it("draws the same card again once its grade leaves the log", () => {
    const d = data(many(12));
    const { grades } = play(d, 5, (id) => (id === "r3" ? 1 : 3));
    const before = drawState(d, grades.slice(0, -1), noon, undefined);
    const after = drawState(d, grades, noon, undefined);
    expect(after.attempts).toBe(before.attempts + 1);
    expect(before.next?.cardId).toBe(grades[grades.length - 1]?.cardId);
  });

  it("gives the same next card from the same data and grades", () => {
    const d = data(many(12));
    const { grades } = play(d, 6, (id) => (id === "r2" ? 1 : 3));
    expect(drawState(d, grades, noon, undefined).next).toEqual(
      drawState(d, [...grades], noon, undefined).next,
    );
  });
});

describe("midnight", () => {
  it("starts a new day with an empty count, and yesterday's miss comes back first", () => {
    const missedAt = new Date(noon.getTime() + 60_000);
    const d = data([
      card("x", { state: 3, due: new Date(missedAt.getTime() + 600_000).toISOString() }),
      ...many(8),
    ]);
    const yesterday = { ...grade("x", 1, 2), reviewedAt: missedAt.toISOString() };
    const tomorrow = new Date(end.getTime() + 3_600_000);
    const s = drawState(d, [yesterday], tomorrow, undefined);
    expect(s.day.date).toBe("2026-09-14");
    expect(s.attempts).toBe(0);
    expect(s.next).toMatchObject({ cardId: "x", kind: "carry" });
  });
});
