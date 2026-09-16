import type { Rating, ReviewMode, StreakOut } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { Card, Draw } from "./api";
import {
  dayOutcome,
  drawableUpTo,
  type EndInput,
  type EndScreen,
  EXTRA_ROUND,
  forgottenRound,
  OTHER_DECKS,
  reviewEnd,
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
    days: [{ date: "2026-09-13", attempts: 4, goal: 5, satisfied: false, outcome: "open" }],
    ...rest,
  } satisfies StreakOut;
};

describe("the day's outcome", () => {
  it("is the goal at the goal's attempt, whatever came before", () => {
    expect(dayOutcome(5, 5)).toBe("goal_met");
    expect(dayOutcome(12, 5)).toBe("goal_met");
  });

  it("is exhausted below the goal, and nothing due with no attempts", () => {
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
      { date: "2026-09-13", attempts: 2, goal: 5, satisfied: true, outcome: "exhausted" },
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

  it("counts what the draw still holds up to a limit, as another round would", () => {
    const plenty = data(30);
    expect(drawableUpTo(plenty, play(plenty, 5), undefined, EXTRA_ROUND)).toBe(EXTRA_ROUND);
    expect(drawableUpTo(plenty, play(plenty, 5), undefined, 20)).toBe(20);
    const few = data(8);
    expect(drawableUpTo(few, play(few, 5), undefined, EXTRA_ROUND)).toBe(3);
    expect(drawableUpTo(few, play(few, 8), undefined, EXTRA_ROUND)).toBe(0);
  });

  it("follows the deck the review is in", () => {
    const d = data(12, (i) => (i < 2 ? "b" : "a"));
    expect(drawableUpTo(d, play(d, 0), "b", EXTRA_ROUND)).toBe(2);
  });
});

const GOAL = 10;
const DECKS = [
  { id: "d1", name: "Chess", due: 0 },
  { id: "d2", name: "Spanish", due: 12 },
  { id: "d3", name: "Maths", due: 3 },
  { id: "d4", name: "Music", due: 30 },
  { id: "d5", name: "Art", due: 1 },
];

const input = (over: Partial<EndInput> = {}): EndInput => ({
  stretch: "goal",
  goal: GOAL,
  from: 0,
  attempts: 4,
  satisfiedBefore: false,
  left: 20,
  confirmed: true,
  scoped: false,
  forgotten: 0,
  otherDecks: [],
  ...over,
});

const screen = (over: Partial<EndInput>): EndScreen => {
  const end = reviewEnd(input(over));
  if (end === "unchecked") throw new Error("expected an end screen");
  return end;
};

const kinds = (end: EndScreen) => end.offers.map((o) => (o.kind === "deck" ? o.name : o.kind));

describe("the end of a stretch", () => {
  it("below the goal with cards left, says Round done and offers the rest of the goal", () => {
    const end = screen({ stretch: "list", from: 2, attempts: 6, forgotten: 2 });
    expect(end).toMatchObject({ heading: "round_done", celebration: "none", count: "round" });
    expect(end.offers).toEqual([
      { kind: "goal", count: 4 },
      { kind: "forgotten", count: 2 },
    ]);
  });

  it("offers only the cards that are left when fewer than the goal needs", () => {
    expect(screen({ stretch: "list", from: 2, attempts: 6, left: 3 }).offers).toEqual([
      { kind: "goal", count: 3 },
    ]);
  });

  it("at the goal from its own stretch, celebrates in full and offers another round", () => {
    const end = screen({ from: 3, attempts: 10, left: 20, forgotten: 1 });
    expect(end).toMatchObject({
      heading: "goal_reached",
      celebration: "full",
      satisfied: true,
      count: "day",
    });
    expect(end.offers).toEqual([
      { kind: "forgotten", count: 1 },
      { kind: "more", count: EXTRA_ROUND },
    ]);
  });

  it("when another round crosses the goal, says so with the lighter celebration", () => {
    const end = screen({ stretch: "list", from: 8, attempts: 13 });
    expect(end).toMatchObject({ heading: "goal_reached", celebration: "light", count: "round" });
  });

  it("once the goal was met before the stretch, says Round done without a celebration", () => {
    const end = screen({ stretch: "more", from: 10, attempts: 20, satisfiedBefore: true, left: 4 });
    expect(end).toMatchObject({ heading: "round_done", celebration: "none", satisfied: true });
    expect(end.offers).toEqual([{ kind: "more", count: 4 }]);
  });

  it("when every deck runs out below the goal, the day counts and it says Nothing left", () => {
    const end = screen({ from: 2, attempts: 7, left: 0 });
    expect(end).toMatchObject({ heading: "nothing_left", celebration: "full", satisfied: true });
    expect(end.offers).toEqual([]);
  });

  it("when one deck runs out below the goal, the day stays open and other decks are offered", () => {
    const end = screen({ from: 2, attempts: 7, left: 0, scoped: true, otherDecks: DECKS });
    expect(end).toMatchObject({ heading: "nothing_left", celebration: "none", satisfied: false });
    expect(end.namesDeck).toBe(true);
    expect(kinds(end)).toEqual(["Music", "Spanish", "Maths"]);
  });

  it("when a deck runs out and no other deck has cards, the day counts as Nothing left today", () => {
    const empty = DECKS.map((d) => ({ ...d, due: 0 }));
    const end = screen({ from: 2, attempts: 7, left: 0, scoped: true, otherDecks: empty });
    expect(end).toMatchObject({ heading: "nothing_left", namesDeck: false, satisfied: true });
    expect(end.offers).toEqual([]);
    // Until the other decks are known, the deck's end claims nothing about the day.
    const unknown = screen({ from: 2, attempts: 7, left: 0, scoped: true, otherDecks: null });
    expect(unknown).toMatchObject({ namesDeck: true, satisfied: false });
  });

  it("with nothing reviewed and nothing to draw, says Nothing due", () => {
    expect(screen({ from: 0, attempts: 0, left: 0 }).heading).toBe("nothing_due");
  });

  it("after the goal, a deck that runs out still offers the other decks", () => {
    const end = screen({ from: 12, attempts: 15, left: 0, scoped: true, otherDecks: DECKS });
    expect(end).toMatchObject({ heading: "nothing_left", namesDeck: true, satisfied: true });
    expect(kinds(end)).toEqual(["Music", "Spanish", "Maths"]);
  });

  it("a reload after the goal with nothing to draw counts the day, not an empty round", () => {
    const end = screen({ stretch: "more", from: 12, attempts: 12, left: 0, satisfiedBefore: true });
    expect(end).toMatchObject({ heading: "nothing_left", count: "day", celebration: "none" });
  });

  it("a reload onto a finished day tells it again without celebrating", () => {
    const end = screen({ from: 7, attempts: 7, left: 0, satisfiedBefore: true });
    expect(end).toMatchObject({ heading: "nothing_left", celebration: "none" });
    expect(screen({ from: 7, attempts: 7, left: 0 }).celebration).toBe("none");
  });

  it("claims nothing when the draw ran dry below the goal without a fetch to confirm it", () => {
    expect(reviewEnd(input({ from: 2, attempts: 7, left: 0, confirmed: false }))).toBe("unchecked");
    // A finished list is still finished; only what else is left stays unknown.
    const list = screen({ stretch: "list", from: 2, attempts: 7, left: 0, confirmed: false });
    expect(list).toMatchObject({ heading: "round_done", satisfied: false, offers: [] });
    // At the goal the day counts whatever the connection says.
    expect(screen({ from: 2, attempts: 10, left: 0, confirmed: false }).heading).toBe(
      "goal_reached",
    );
  });
});

describe("every end, whatever the inputs", () => {
  const cases: EndInput[] = [];
  for (const stretch of ["goal", "more", "list"] as const)
    for (const [from, attempts] of [
      [0, 0],
      [0, 4],
      [0, 10],
      [4, 4],
      [4, 9],
      [4, 12],
      [10, 10],
      [10, 15],
      [14, 30],
    ] as const)
      for (const satisfiedBefore of [false, true])
        for (const left of [0, 3, 25])
          for (const confirmed of [false, true])
            for (const scoped of [false, true])
              for (const forgotten of [0, 2])
                for (const otherDecks of [null, [], DECKS])
                  cases.push(
                    input({
                      stretch,
                      from,
                      attempts,
                      satisfiedBefore,
                      left,
                      confirmed,
                      scoped,
                      forgotten,
                      otherDecks,
                    }),
                  );

  function check(c: EndInput) {
    const met = c.attempts >= GOAL;
    const end = reviewEnd(c);
    const dryUnconfirmed = c.left === 0 && !c.confirmed;
    expect(end === "unchecked").toBe(dryUnconfirmed && !met && c.stretch !== "list");
    if (end === "unchecked") return;

    // Nothing left or due is only said after a confirmed empty draw.
    if (end.heading === "nothing_left" || end.heading === "nothing_due") {
      expect(c.left === 0 && c.confirmed).toBe(true);
    }
    if (end.heading === "nothing_due") expect(c.attempts).toBe(0);
    expect(end.heading === "goal_reached").toBe(met && c.from < GOAL);

    // Below the goal a deck's end counts the day only once every other deck is known to be empty.
    const elsewhere = c.scoped && (c.otherDecks?.some((d) => d.due > 0) ?? true);
    if (met) expect(end.satisfied).toBe(true);
    if (elsewhere && !met) expect(end.satisfied).toBe(false);
    expect(end.namesDeck).toBe(end.heading === "nothing_left" && elsewhere);

    // Celebrate only when this stretch turned the day, and in full only from the goal's own stretch.
    const turned = end.satisfied && !c.satisfiedBefore && c.attempts > c.from;
    expect(end.celebration !== "none").toBe(turned);
    if (end.celebration === "full") expect(c.stretch).toBe("goal");
    expect(end.count).toBe(c.stretch === "goal" || c.attempts === c.from ? "day" : "round");

    const offer = (kind: string) => end.offers.filter((o) => o.kind === kind);
    for (const o of end.offers) expect(o.count).toBeGreaterThan(0);
    expect(offer("forgotten").length).toBe(c.forgotten > 0 ? 1 : 0);
    expect(offer("goal").length).toBe(!met && c.left > 0 ? 1 : 0);
    expect(offer("more").length).toBe(met && c.left > 0 ? 1 : 0);
    for (const o of offer("goal")) expect(o.count).toBeLessThanOrEqual(GOAL - c.attempts);
    for (const o of offer("more")) expect(o.count).toBeLessThanOrEqual(EXTRA_ROUND);

    const decks = offer("deck");
    const shouldList = c.scoped && c.left === 0 && c.confirmed;
    if (!shouldList) expect(decks).toEqual([]);
    else {
      const due = (c.otherDecks ?? []).filter((d) => d.due > 0).map((d) => d.due);
      expect(decks.length).toBe(Math.min(OTHER_DECKS, due.length));
      expect(decks.map((d) => d.count)).toEqual([...due].sort((a, b) => b - a).slice(0, 3));
    }
  }

  it(`holds the rules across all ${cases.length} combinations`, () => {
    for (const c of cases) {
      try {
        check(c);
      } catch (error) {
        const shown = JSON.stringify({ ...c, otherDecks: c.otherDecks?.length ?? null });
        throw new Error(`${shown}\n${(error as Error).message}`);
      }
    }
  });
});
