import { drawKey, modeKey, type Rating } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { Offer } from "../review-end";
import type { FlowInputs, LastGrade } from "./core";
import { draw, Review, round } from "./review-harness";

/*
 * Walks every order of a learner's taps and the server's answers through flowReducer and flowView,
 * up to a few grades, and checks the review's rules after each step. It drives the reducer as
 * use-review-flow.ts does: one grade per position, answers to a grade taken back go unheard, and
 * Undo's answer comes after its grade's.
 */

type Answer = "sent" | "refused" | "gone";

interface World {
  review: Review;
  /** Grades whose answer has not come, oldest first. */
  air: LastGrade[];
  /** Grades taken back whose Undo has not been answered. */
  undoAir: LastGrade[];
  /** Grades the server holds, by when they were made. */
  server: ReadonlySet<string>;
  /** The hook's gradedAt: the position last graded, -1 once Undo frees it. */
  gradedAt: number;
  /** The hook's own `undone`, which drops the answers to grades taken back. */
  undone: ReadonlySet<string>;
  made: number;
}

interface Bound {
  name: string;
  data: FlowInputs["data"];
  over: Partial<FlowInputs>;
  grades: number;
  ratings: Rating[];
  /** Steps and end screens the walk must reach, or it checks less than it claims. */
  reaches: string[];
}

const at = (last: LastGrade) => last.grade.reviewedAt;
const without = (list: LastGrade[], last: LastGrade) => list.filter((l) => l !== last);
const plus = (set: ReadonlySet<string>, key: string) => new Set(set).add(key);
const minus = (set: ReadonlySet<string>, key: string) => {
  const next = new Set(set);
  next.delete(key);
  return next;
};

function fork(w: World): World {
  return { ...w, review: w.review.clone() };
}

/** Every step the learner, the server or the draw's refetch can take next, by name. */
function moves(w: World, bound: Bound): [string, () => World][] {
  const out: [string, () => World][] = [];
  const view = w.review.view;
  const { flow } = w.review;

  if (view.current && w.made < bound.grades && w.gradedAt !== flow.position) {
    for (const rating of bound.ratings) {
      out.push([
        `you grade ${view.current.card.id} ${rating}`,
        () => {
          const n = fork(w);
          n.gradedAt = flow.position;
          const last = n.review.grade(rating);
          return { ...n, air: [...n.air, last], made: n.made + 1 };
        },
      ]);
    }
  }

  for (const last of w.air) {
    for (const answer of ["sent", "refused", "gone"] as Answer[]) {
      out.push([
        `the server answers ${last.item.card.id}'s grade: ${answer}`,
        () => {
          const n = fork(w);
          if (w.undone.has(at(last))) {
            n.review.dispatch({ type: "sent" });
          } else {
            n.review.settle(last, answer);
          }
          return {
            ...n,
            air: without(n.air, last),
            server: answer === "sent" ? plus(n.server, at(last)) : n.server,
          };
        },
      ]);
    }
  }

  const last = flow.last;
  if (last) {
    out.push([
      `you undo ${last.item.card.id}`,
      () => {
        const n = fork(w);
        n.review.grades = n.review.grades.filter((g) => g !== last.grade);
        n.review.dispatch({ type: "undone", last });
        return {
          ...n,
          gradedAt: -1,
          undone: plus(n.undone, at(last)),
          undoAir: [...n.undoAir, last],
        };
      },
    ]);
  }

  // grades.ts sends in order, so Undo is answered after the grade it takes back.
  for (const undo of w.undoAir.filter((u) => !w.air.includes(u))) {
    out.push([
      `the server takes ${undo.item.card.id}'s grade back`,
      () => ({ ...fork(w), undoAir: without(w.undoAir, undo), server: minus(w.server, at(undo)) }),
    ]);
    if (w.server.has(at(undo))) {
      out.push([
        `the server keeps ${undo.item.card.id}'s grade`,
        () => {
          const n = fork(w);
          n.review.grades = [...n.review.grades, undo.grade];
          n.review.dispatch({ type: "undoRefused", last: undo, step: w.gradedAt === -1 });
          return { ...n, undoAir: without(n.undoAir, undo), undone: minus(n.undone, at(undo)) };
        },
      ]);
    }
  }

  // A draw fetch begun after the last grade lands, so an empty draw can be believed.
  const inputs = w.review.inputs();
  if (inputs.data && inputs.data.fetchedAt < inputs.lastChange) {
    out.push([
      "the draw refetch lands",
      () => {
        const n = fork(w);
        if (n.review.data) n.review.data = { ...n.review.data, fetchedAt: inputs.lastChange + 1 };
        n.review.step();
        return n;
      },
    ]);
  }

  if (view.current && view.added) {
    out.push([
      "you leave",
      () => {
        const n = fork(w);
        n.review.dispatch({ type: "paused" });
        return n;
      },
    ]);
  }

  if (view.end && view.end !== "unchecked") {
    for (const offer of view.end.offers) {
      out.push([
        `you take ${offerName(offer)}`,
        () => {
          const n = fork(w);
          n.review.takeOffer(offer);
          return n;
        },
      ]);
    }
  }
  return out;
}

/** A step's label without its card, such as "the server answers grade: refused". */
const kind = (label: string) => label.replace(/ [a-c]'s| [a-c](?= |$)/g, "");

const offerName = (offer: Offer) =>
  offer.kind === "forgotten" ? "the forgotten cards" : `Continue (${offer.to})`;

/** The rules, each a function of where the review stands that names what broke, or null. */
const rules: Record<string, (w: World) => string | null> = {
  endNeverOverACard: ({ review }) => {
    const { end, current } = review.view;
    return end && current ? `the end shows over ${current.card.id}` : null;
  },
  endWaitsForEveryAnswer: ({ review, air }) => {
    const { end } = review.view;
    return end && end !== "unchecked" && air.length > 0
      ? `the end shows with ${air.length} answer(s) still to come`
      : null;
  },
  undoOnlyForAHeldGrade: ({ review, air, server }) => {
    const last = review.flow.last;
    if (!last || air.includes(last) || server.has(at(last))) return null;
    return `Undo is offered for ${last.item.card.id}, a grade the server does not hold`;
  },
  endCountsOnlyKeptGrades: ({ review, server }) => {
    const { end, leg } = review.view;
    if (!end || end === "unchecked") return null;
    if (leg?.kind === "draw") {
      const lost = review.grades.find((g) => !server.has(g.reviewedAt));
      return lost ? `the end counts ${lost.cardId}, whose grade the server does not hold` : null;
    }
    const kept = [...review.grades]
      .filter((g) => server.has(g.reviewedAt))
      .map((g) => drawKey(g.cardId, modeKey(g.mode)));
    const lost = [...review.flow.cards.graded].find((key) => !kept.includes(key));
    return lost ? `the end counts ${lost}, whose grade the server does not hold` : null;
  },
};

/** One step's state, so two orders that meet are walked on once. */
function stateKey(w: World): string {
  const { flow } = w.review;
  const sets = (s: ReadonlySet<string>) => [...s].sort();
  const lastAt = (l: LastGrade | null) => (l ? at(l) : null);
  return JSON.stringify([
    flow.leg,
    flow.mark,
    flow.paused,
    flow.pinned,
    sets(flow.cards.graded),
    sets(flow.cards.returned),
    sets(flow.cards.dropped),
    flow.sending,
    flow.position,
    lastAt(flow.last),
    sets(flow.undone),
    w.review.grades.map((g) => [g.reviewedAt, g.rating]),
    w.review.data?.fetchedAt,
    w.air.map(at),
    w.undoAir.map(at),
    sets(w.server),
    w.gradedAt,
    sets(w.undone),
    w.made,
  ]);
}

interface Walk {
  states: number;
  steps: number;
  /** The shortest path to each rule's first break. */
  broken: Record<string, string[]>;
  /** Each kind of step taken and each end screen shown, so a walk that misses one shows it. */
  reached: Set<string>;
}

/** Breadth first, so a broken rule comes with the shortest path to it. */
function walk(bound: Bound): Walk {
  const first: World = {
    review: new Review(bound.data, bound.over),
    air: [],
    undoAir: [],
    server: new Set(),
    gradedAt: -1,
    undone: new Set(),
    made: 0,
  };
  const seen = new Set([stateKey(first)]);
  let frontier: { w: World; path: string[] }[] = [{ w: first, path: [] }];
  const broken: Record<string, string[]> = {};
  const reached = new Set<string>();
  let steps = 0;
  const check = (w: World, path: string[]) => {
    for (const [name, rule] of Object.entries(rules)) {
      const why = rule(w);
      if (why && !broken[name]) broken[name] = [...path, `→ ${why}`];
    }
  };
  check(first, []);
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { w, path } of frontier) {
      for (const [label, take] of moves(w, bound)) {
        steps += 1;
        reached.add(kind(label));
        const n = take();
        const key = stateKey(n);
        if (seen.has(key)) continue;
        seen.add(key);
        const p = [...path, label];
        check(n, p);
        const { end } = n.review.view;
        if (end && end !== "unchecked") reached.add(`end: ${end.heading}`);
        next.push({ w: n, path: p });
      }
    }
    frontier = next;
  }
  return { states: seen.size, steps, broken, reached };
}

/** Three grades walk each bound in seconds; four take minutes. */
const GRADES = 3;

const everyStep = [
  "you grade 3",
  "the server answers grade: sent",
  "the server answers grade: refused",
  "the server answers grade: gone",
  "you undo",
  "the server takes grade back",
  "the server keeps grade",
  "the draw refetch lands",
  "you leave",
  "you take Continue (resume)",
  "you take Continue (day)",
];

const bounds: Bound[] = [
  {
    name: "the day's draw: three cards due, a goal of two",
    data: draw(["a", "b", "c"], 2),
    over: {},
    grades: GRADES,
    ratings: [3, 1],
    reaches: [...everyStep, "you take the forgotten cards", "end: goal_reached", "end: day_done"],
  },
  {
    name: "a round of two cards",
    data: draw(["a"]),
    over: round(["a", "b"]),
    grades: GRADES,
    ratings: [3],
    reaches: [...everyStep, "end: round_done"],
  },
];

describe("every order of taps and answers", () => {
  for (const bound of bounds) {
    it(`keeps the review's rules in ${bound.name}`, { timeout: 600_000 }, () => {
      const result = walk(bound);
      expect(result.broken).toEqual({});
      expect([...result.reached]).toEqual(expect.arrayContaining(bound.reaches));
    });
  }
});
