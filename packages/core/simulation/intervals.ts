import { createEmptyCard, type Card as FsrsCard, fsrs, type Grade, get_fuzz_range } from "ts-fsrs";
import { DESIRED_RETENTION, SCHEDULER_PARAMETERS } from "../src/fsrs";
import type { Rating } from "../src/types";

const START = new Date("2026-01-01T09:00:00Z");
const GRADES = [1, 2, 3, 4] as const satisfies readonly Rating[];
/** How many grades a ladder follows. */
const LADDER_LENGTH = 5;
/** A return comes a few attempts after the miss, which is a minute or two, not the step's ten. */
const RETURN_AFTER_MS = 2 * 60_000;

/** The app's scheduler with fuzz off, so an example shows the interval before its random nudge. */
const exact = fsrs({ ...SCHEDULER_PARAMETERS, enable_fuzz: false });

const grade = (card: FsrsCard, rating: Rating, at: Date) =>
  exact.next(card, at, rating as Grade).card;
const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

export interface Step {
  /** Until the card is due again. */
  minutes: number;
  stability: number;
  difficulty: number;
}

function step(card: FsrsCard, at: Date): Step {
  return {
    minutes: Math.round((card.due.getTime() - at.getTime()) / 60_000),
    stability: round(card.stability),
    difficulty: round(card.difficulty),
  };
}

/** A card graded `first`, then Good every time it comes due, `length` grades in all. */
function ladder(first: Rating, from = createEmptyCard(START), at = START, length = LADDER_LENGTH) {
  let card = grade(from, first, at);
  const steps = [step(card, at)];
  while (steps.length < length) {
    // A card inside its learning step comes back within the review, not on its ten-minute due.
    at = card.scheduled_days === 0 ? new Date(at.getTime() + RETURN_AFTER_MS) : card.due;
    card = grade(card, 3, at);
    steps.push(step(card, at));
  }
  return steps;
}

/** The card after `goods` on-time Good grades from new, with the moment it next comes due. */
function learned(goods: number) {
  let card = createEmptyCard(START);
  let at = START;
  for (let i = 0; i < goods; i++) {
    card = grade(card, 3, at);
    at = card.due;
  }
  return { card, due: at };
}

/**
 * Worked examples from the real scheduler parameters. Nothing here is a learner's data: every
 * card starts empty on the same fixed date.
 */
export function intervalGuide() {
  const fresh = createEmptyCard(START);
  const firstGrade = GRADES.map((rating) => ({
    rating,
    ...step(grade(fresh, rating, START), START),
  }));

  const ladders = GRADES.map((rating) => ({ rating, steps: ladder(rating) }));

  // A card on each rung of the Good ladder, graded every way on the day it comes due.
  const learnedCards = [1, 2, 3, 4].map((goods) => {
    const { card, due } = learned(goods);
    return {
      interval: round(card.scheduled_days),
      retrievability: round(exact.get_retrievability(card, due, false), 3),
      grades: GRADES.map((rating) => ({ rating, ...step(grade(card, rating, due), due) })),
    };
  });

  // The card on the longest of those rungs, forgotten on its due day and then Good every time.
  const { card: before, due: forgotAt } = learned(4);
  const forgetting = {
    interval: round(before.scheduled_days),
    stability: round(before.stability),
    forgot: ladder(1, before, forgotAt),
    remembered: ladder(3, before, forgotAt, 3),
  };

  // Retrievability over time for the first three rungs: each crosses the target on its due day.
  const rungs = [1, 2, 3].map((goods) => learned(goods).card);
  const longest = Math.max(...rungs.map((card) => card.scheduled_days));
  // Long enough to show the longest rung's due day, in tens of days, and 120 steps across.
  const spanDays = Math.max(60, Math.ceil((longest * 1.3) / 10) * 10);
  const stepDays = spanDays / 120;
  const curves = rungs.map((card) => ({
    interval: round(card.scheduled_days),
    stability: round(card.stability),
    points: Array.from({ length: 121 }, (_, i) =>
      round(exact.forgetting_curve(i * stepDays, card.stability), 4),
    ),
  }));

  const goodDays = (ladders.find((l) => l.rating === 3)?.steps ?? []).map((s) => s.minutes / 1440);
  const fuzz = goodDays
    .map((d, i) => {
      const range = get_fuzz_range(d, goodDays[i - 1] ?? 0, SCHEDULER_PARAMETERS.maximum_interval);
      return { days: d, min: range.min_ivl, max: range.max_ivl };
    })
    .filter((f) => f.days >= 3);

  return {
    retention: DESIRED_RETENTION,
    firstGrade,
    ladders,
    learnedCards,
    forgetting,
    curves: { stepDays, series: curves },
    fuzz,
  };
}

export type IntervalGuide = ReturnType<typeof intervalGuide>;
