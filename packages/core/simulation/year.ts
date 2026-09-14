import { State } from "ts-fsrs";
import { type Candidate, DRAW_POLICY, type DrawPolicy, weightedKey } from "../src/draw";
import { emptyState, retrievability } from "../src/fsrs";
import { DAY_MS, playDay, rng, type SimMode, utcDay } from "./learner";

const START = Date.parse("2026-01-01T12:00:00Z");
const MODE = "term_to_meaning";

const reviewWith = (reviewKey: DrawPolicy["reviewKey"]): DrawPolicy => ({
  ...DRAW_POLICY,
  reviewKey,
});
const r = (c: Candidate) => c.mode.retrievability;

/** The orders ADR 0019 weighed, each run through the real draw with only the review key swapped. */
export const REVIEW_ORDERS = {
  due: reviewWith((c) => -c.mode.due.getTime()),
  lowest: reviewWith((c) => -r(c)),
  highest: reviewWith((c) => r(c)),
  random: reviewWith((c, day) => weightedKey(day.date, c.cardId, c.mode.mode, 1)),
  forgetting: reviewWith((c, day) => weightedKey(day.date, c.cardId, c.mode.mode, 1 - r(c))),
  lymi: DRAW_POLICY,
} satisfies Record<string, DrawPolicy>;

export type ReviewOrderId = keyof typeof REVIEW_ORDERS;

export const REVIEW_ORDER_STUDY = {
  days: 365,
  goal: 50,
  seeds: [42, 7, 99, 1234],
  /** Unseen cards are topped up to this each morning, so a new-card slot is never empty. */
  unseenPool: 20,
} as const;

function reviewOrderRun(policy: DrawPolicy, seed: number) {
  const { days, goal, unseenPool } = REVIEW_ORDER_STUDY;
  const random = rng(seed);
  const modes: SimMode[] = [];
  for (let d = 0; d < days; d++) {
    const day = utcDay(START + d * DAY_MS);
    const unseen = modes.filter((m) => m.card.state === State.New).length;
    for (let i = unseen; i < unseenPool; i++) {
      modes.push({
        cardId: `c${modes.length}`,
        deckId: "d",
        mode: MODE,
        card: emptyState(day.start),
        added: day.start,
        hasCue: true,
      });
    }
    playDay(modes, day, random, goal, { policy });
  }
  const end = new Date(START + days * DAY_MS);
  const introduced = modes.filter((m) => m.card.state !== State.New);
  return {
    introduced: introduced.length,
    remembered: introduced.reduce((sum, m) => sum + retrievability(m.card, end), 0),
    late: introduced.filter((m) => m.card.due.getTime() < end.getTime() - 7 * DAY_MS).length,
  };
}

/** A year at the default goal under each review order, averaged over the seeds. */
export function reviewOrderStudy() {
  const { seeds } = REVIEW_ORDER_STUDY;
  return (Object.keys(REVIEW_ORDERS) as ReviewOrderId[]).map((id) => {
    const runs = seeds.map((seed) => reviewOrderRun(REVIEW_ORDERS[id], seed));
    const mean = (key: keyof (typeof runs)[number]) =>
      Math.round(runs.reduce((sum, run) => sum + run[key], 0) / runs.length);
    return {
      id,
      introduced: mean("introduced"),
      remembered: mean("remembered"),
      late: mean("late"),
    };
  });
}

const ageDays = (c: Candidate, start: Date) =>
  Math.max(0, start.getTime() - c.mode.added.getTime()) / DAY_MS;
const halvesWeekly = (c: Candidate, start: Date) => 0.5 ** (ageDays(c, start) / 7);

/** The new-card rules ADR 0019 weighed, with only the unseen key and the oldest slot swapped. */
export const NEW_CARD_RULES = {
  halving: { ...DRAW_POLICY, oldestSlotEvery: Number.POSITIVE_INFINITY },
  floor: {
    ...DRAW_POLICY,
    oldestSlotEvery: Number.POSITIVE_INFINITY,
    unseenKey: (c, day) =>
      weightedKey(day.date, c.cardId, c.mode.mode, Math.max(1 / 8, halvesWeekly(c, day.start))),
  },
  equal: {
    ...DRAW_POLICY,
    oldestSlotEvery: Number.POSITIVE_INFINITY,
    unseenKey: (c, day) => weightedKey(day.date, c.cardId, c.mode.mode, 1),
  },
  oldest: { ...DRAW_POLICY, oldestSlotEvery: 1 },
  lymi: DRAW_POLICY,
} satisfies Record<string, DrawPolicy>;

export type NewCardRuleId = keyof typeof NEW_CARD_RULES;

export const NEW_CARD_STUDY = {
  days: 365,
  goal: 25,
  seed: 7,
  joinedDeck: 300,
  lessonSize: 60,
  lessonEveryDays: 7,
} as const;

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)] ?? 0;
};

function newCardRun(policy: DrawPolicy) {
  const { days, goal, seed, joinedDeck, lessonSize, lessonEveryDays } = NEW_CARD_STUDY;
  const random = rng(seed);
  const first = utcDay(START);
  const modes: SimMode[] = [];
  const byId = new Map<string, SimMode>();
  const add = (deckId: string, count: number, added: Date) => {
    for (let i = 0; i < count; i++) {
      const cardId = `${deckId}${modes.length}`;
      const sim = { cardId, deckId, mode: MODE, card: emptyState(added), added, hasCue: true };
      modes.push(sim);
      byId.set(cardId, sim);
    }
  };
  add("joined", joinedDeck, first.start);
  const waits: number[] = [];
  let joinedStarted = 0;
  for (let d = 0; d < days; d++) {
    const day = utcDay(START + d * DAY_MS);
    if (d > 0 && d % lessonEveryDays === 0) add("lesson", lessonSize, day.start);
    const { attempts } = playDay(modes, day, random, goal, { policy });
    for (const a of attempts) {
      if (a.kind !== "unseen") continue;
      const sim = byId.get(a.cardId) as SimMode;
      if (sim.deckId === "joined") joinedStarted++;
      else waits.push(Math.round((day.start.getTime() - sim.added.getTime()) / DAY_MS));
    }
  }
  return {
    medianWait: percentile(waits, 0.5),
    p90Wait: percentile(waits, 0.9),
    joinedStarted,
  };
}

/** A joined deck and a weekly lesson arriving faster than new-card slots can start them. */
export function newCardStudy() {
  return (Object.keys(NEW_CARD_RULES) as NewCardRuleId[]).map((id) => ({
    id,
    ...newCardRun(NEW_CARD_RULES[id]),
  }));
}
