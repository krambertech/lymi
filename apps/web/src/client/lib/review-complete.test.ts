import type { Rating, ReviewMode, StreakOut } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { Card, Draw } from "./api";
import {
  dayOutcome,
  drawableLeft,
  type EndInput,
  type EndScreen,
  emberCount,
  forgottenRound,
  reviewEnd,
  streakAsOf,
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
    restDays: [],
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

describe("the streak as of the last end screen", () => {
  const counted = summary({
    outcome: "goal_met",
    current: 4,
    longest: 4,
    days: [{ date: "2026-09-13", attempts: 5, goal: 5, satisfied: true, outcome: "goal_met" }],
  });

  it("takes today back out when the refetch counts it already, so the end can show it turn", () => {
    const then = streakAsOf(counted, 3, false);
    expect(then.current).toBe(3);
    expect(then.today).toMatchObject({ attempts: 3, outcome: "open" });
    expect(then.days.at(-1)).toMatchObject({ attempts: 3, satisfied: false, outcome: "open" });
  });

  it("keeps today when it already counted at the last screen", () => {
    expect(streakAsOf(counted, 5, true).current).toBe(4);
    expect(streakAsOf(summary(), 2, false).current).toBe(3);
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

  it("counts the cards the draw still holds, keeping a forgotten card owed a return", () => {
    const d = data(8);
    expect(drawableLeft(d, play(d, 0), undefined)).toBe(8);
    expect(drawableLeft(d, play(d, 3), undefined)).toBe(5);
    expect(
      drawableLeft(
        d,
        play(d, 3, (i) => (i === 0 ? 1 : 3)),
        undefined,
      ),
    ).toBe(6);
    expect(drawableLeft(d, play(d, 8), undefined)).toBe(0);
  });

  it("follows the deck the review is in", () => {
    const d = { ...data(12, (i) => (i < 2 ? "b" : "a")), total: 2 };
    expect(drawableLeft(d, play(d, 0), "b")).toBe(2);
  });

  it("counts the cards behind the fetched front of the order", () => {
    const d = { ...data(8), total: 150 };
    expect(drawableLeft(d, play(d, 0), undefined)).toBe(150);
    expect(drawableLeft(d, play(d, 3), undefined)).toBe(147);
    expect(
      drawableLeft(
        d,
        play(d, 3, (i) => (i === 0 ? 1 : 3)),
        undefined,
      ),
    ).toBe(148);
  });
});

describe("embers", () => {
  it("rise for any review, grow with the share of the goal added, and stop at twice the goal", () => {
    expect(emberCount(0, 50)).toBe(0);
    expect(emberCount(1, 50)).toBe(3);
    expect(emberCount(12.5, 50)).toBe(6);
    expect(emberCount(25, 50)).toBe(9);
    expect(emberCount(50, 50)).toBe(14);
    expect(emberCount(100, 50)).toBe(20);
    expect(emberCount(400, 50)).toBe(20);
    for (let n = 1; n < 120; n++) {
      expect(emberCount(n + 1, 50)).toBeGreaterThanOrEqual(emberCount(n, 50));
    }
  });
});

const GOAL = 10;

const input = (over: Partial<EndInput> = {}): EndInput => ({
  stretch: "day",
  ending: "empty",
  goal: GOAL,
  from: 0,
  attempts: 4,
  satisfiedBefore: false,
  left: 20,
  confirmed: true,
  elsewhere: 0,
  forgotten: 0,
  ...over,
});

const screen = (over: Partial<EndInput>): EndScreen => {
  const end = reviewEnd(input(over));
  if (end === "unchecked") throw new Error("expected an end screen");
  return end;
};

describe("the end of a stretch", () => {
  it("at the goal's stop, celebrates the day and offers the rest of it beside Done", () => {
    const end = screen({ ending: "goal", from: 0, attempts: 10, left: 12, forgotten: 3 });
    expect(end).toMatchObject({
      heading: "goal_reached",
      satisfied: true,
      streak: true,
      embers: 14,
      continueLeads: false,
      nudge: null,
    });
    expect(end.offers).toEqual([
      { kind: "continue", to: "day" },
      { kind: "forgotten", count: 3 },
    ]);
  });

  it("when the day runs out below the goal, it counts, and nothing is left to continue", () => {
    const end = screen({ from: 0, attempts: 7, left: 0 });
    expect(end).toMatchObject({ heading: "day_done", satisfied: true, streak: true, offers: [] });
  });

  it("left below the goal, leads with Continue and says how many more to the goal", () => {
    const end = screen({ ending: "left", from: 0, attempts: 4, left: 12 });
    expect(end).toMatchObject({
      heading: "review_done",
      streak: false,
      continueLeads: true,
      nudge: { kind: "goal", count: 6 },
    });
    expect(end.offers).toEqual([{ kind: "continue", to: "resume" }]);
  });

  it("left with fewer cards in the day than the goal needs, says how many finish the day", () => {
    const end = screen({ ending: "left", attempts: 4, left: 3 });
    expect(end.nudge).toEqual({ kind: "day", count: 3 });
  });

  it("the rest of the day running out throws embers without the streak moment", () => {
    const end = screen({ from: 10, attempts: 14, left: 0, satisfiedBefore: true });
    expect(end).toMatchObject({ heading: "day_done", streak: false, continueLeads: false });
    expect(end.embers).toBeGreaterThan(0);
  });

  it("a deck that crosses the goal and runs out says the goal, and continues to the day", () => {
    const end = screen({ stretch: "scope", from: 6, attempts: 14, left: 0, elsewhere: 12 });
    expect(end).toMatchObject({ heading: "goal_reached", streak: true, continueLeads: false });
    expect(end.offers).toEqual([{ kind: "continue", to: "day" }]);
  });

  it("a deck that runs out below the goal leaves the day open and leads on to it", () => {
    const end = screen({ stretch: "scope", from: 2, attempts: 7, left: 0, elsewhere: 12 });
    expect(end).toMatchObject({
      heading: "scope_done",
      satisfied: false,
      streak: false,
      continueLeads: true,
      nudge: { kind: "goal", count: 3 },
    });
    expect(end.offers).toEqual([{ kind: "continue", to: "day" }]);
  });

  it("the last deck running out below the goal finishes the day", () => {
    const end = screen({ stretch: "scope", from: 2, attempts: 7, left: 0, elsewhere: 0 });
    expect(end).toMatchObject({ heading: "day_done", satisfied: true, streak: true, offers: [] });
    // Until the other decks are known, the deck's end claims nothing about the day.
    const unknown = screen({ stretch: "scope", from: 2, attempts: 7, left: 0, elsewhere: null });
    expect(unknown).toMatchObject({ heading: "scope_done", satisfied: false });
    expect(unknown.nudge).toEqual({ kind: "goal", count: 3 });
  });

  it("a walked round below the goal says Round done and leads on to the day", () => {
    const end = screen({ stretch: "list", from: 2, attempts: 6, left: 12, forgotten: 1 });
    expect(end).toMatchObject({ heading: "round_done", continueLeads: true });
    expect(end.offers).toEqual([
      { kind: "continue", to: "day" },
      { kind: "forgotten", count: 1 },
    ]);
  });

  it("with nothing reviewed and nothing to draw, says Nothing due", () => {
    expect(screen({ from: 0, attempts: 0, left: 0 })).toMatchObject({
      heading: "nothing_due",
      embers: 0,
      offers: [],
    });
  });

  it("a reload onto an empty deck adds nothing, so it throws no embers", () => {
    const end = screen({ stretch: "scope", from: 7, attempts: 7, left: 0, elsewhere: 5 });
    expect(end).toMatchObject({ heading: "scope_done", embers: 0, streak: false });
  });

  it("claims nothing when the draw ran dry below the goal without a fetch to confirm it", () => {
    expect(reviewEnd(input({ from: 2, attempts: 7, left: 0, confirmed: false }))).toBe("unchecked");
    // A walked list is still walked; only what else is left stays unknown.
    const list = screen({ stretch: "list", from: 2, attempts: 7, left: 0, confirmed: false });
    expect(list).toMatchObject({ heading: "round_done", satisfied: false });
    // At the goal the day counts whatever the connection says.
    expect(screen({ from: 2, attempts: 10, left: 0, confirmed: false }).heading).toBe(
      "goal_reached",
    );
  });
});

describe("every end, whatever the inputs", () => {
  const cases: EndInput[] = [];
  // Only the day's draw stops at the goal, so no other stretch ends there.
  for (const stretch of ["day", "scope", "list"] as const)
    for (const ending of ["goal", "empty", "left"] as const)
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
              for (const elsewhere of [null, 0, 12])
                for (const forgotten of [0, 2])
                  if (ending !== "goal" || stretch === "day")
                    cases.push(
                      input({
                        stretch,
                        ending,
                        from,
                        attempts,
                        satisfiedBefore,
                        left,
                        confirmed,
                        elsewhere,
                        forgotten,
                      }),
                    );

  function check(c: EndInput) {
    const met = c.attempts >= GOAL;
    const end = reviewEnd(c);
    expect(end === "unchecked").toBe(
      c.ending === "empty" && c.stretch !== "list" && !c.confirmed && !met,
    );
    if (end === "unchecked") return;

    // The day is called empty only after a confirmed empty draw, with every other deck known empty.
    const dayEmpty = c.left === 0 && c.confirmed && c.elsewhere === 0;
    if (end.heading === "day_done" || end.heading === "nothing_due") expect(dayEmpty).toBe(true);
    if (end.heading === "nothing_due") expect(c.attempts).toBe(0);
    expect(end.heading === "goal_reached").toBe(met && (c.from < GOAL || c.ending === "goal"));
    expect(end.satisfied).toBe(met || (dayEmpty && c.attempts > 0));

    // Embers follow the reviews added; the streak moment follows only the day turning.
    expect(end.streak).toBe(end.satisfied && !c.satisfiedBefore && c.attempts > c.from);
    if (c.attempts <= c.from) expect(end.embers).toBe(0);
    else {
      expect(end.embers).toBeGreaterThanOrEqual(3);
      expect(end.embers).toBeLessThanOrEqual(20);
    }

    const proceed = end.offers.filter((o) => o.kind === "continue");
    const dayHasCards = c.left + (c.elsewhere ?? 1) > 0;
    expect(proceed.length).toBe(c.ending === "left" || dayHasCards ? 1 : 0);
    for (const o of proceed) expect(o.to).toBe(c.ending === "left" ? "resume" : "day");
    expect(end.offers.filter((o) => o.kind === "forgotten").length).toBe(c.forgotten > 0 ? 1 : 0);

    // Continue leads only while the day is open, and then the line says what is left of it.
    expect(end.continueLeads).toBe(!end.satisfied && proceed.length > 0);
    expect(!!end.nudge).toBe(end.continueLeads);
    if (end.nudge) {
      expect(end.nudge.count).toBeGreaterThan(0);
      expect(end.nudge.count).toBeLessThanOrEqual(GOAL - c.attempts);
    }
  }

  it(`holds the rules across all ${cases.length} combinations`, () => {
    for (const c of cases) {
      try {
        check(c);
      } catch (error) {
        throw new Error(`${JSON.stringify(c)}\n${(error as Error).message}`);
      }
    }
  });
});
