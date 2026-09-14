import {
  createEmptyCard,
  type Card as FsrsCard,
  Rating as FsrsRating,
  fsrs,
  type Grade,
  generatorParameters,
  State,
} from "ts-fsrs";
import type { Rating } from "./types";

export type { FsrsCard };
export { State };

/**
 * One learning and relearning step, ADR 0019. The step sets FSRS state only: a missed mode
 * returns after a number of attempts, not minutes, so `draw` never reads the ten minutes.
 */
export const LEARNING_STEPS = ["10m"] as const;

/** The recall probability FSRS schedules for: a card falls due when it drops to this. */
export const DESIRED_RETENTION = 0.9;

/**
 * One scheduler for the whole app. Weights are the FSRS defaults for now;
 * once there is review history they can be optimised per user.
 */
export const SCHEDULER_PARAMETERS = Object.freeze(
  generatorParameters({
    request_retention: DESIRED_RETENTION,
    enable_fuzz: true,
    learning_steps: LEARNING_STEPS,
    relearning_steps: LEARNING_STEPS,
  }),
);

const scheduler = fsrs(SCHEDULER_PARAMETERS);

const RATING_MAP: Record<Rating, Grade> = {
  1: FsrsRating.Again,
  2: FsrsRating.Hard,
  3: FsrsRating.Good,
  4: FsrsRating.Easy,
};

/** A fresh scheduling state for a card that has never been reviewed. */
export function emptyState(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

export interface ScheduleResult {
  card: FsrsCard;
  /** What the log needs: elapsed and scheduled days at the moment of review. */
  log: {
    rating: Rating;
    state: State;
    due: Date;
    elapsedDays: number;
    scheduledDays: number;
    review: Date;
  };
}

/** Apply one grade to a card state and return the next state plus a log entry. */
export function schedule(state: FsrsCard, rating: Rating, now: Date = new Date()): ScheduleResult {
  const { card, log } = scheduler.next(state, now, RATING_MAP[rating]);
  return {
    card,
    log: {
      rating,
      state: log.state,
      due: log.due,
      elapsedDays: log.elapsed_days,
      scheduledDays: log.scheduled_days,
      review: log.review,
    },
  };
}

/** The four possible outcomes for the grade buttons: "Again 1m · Hard 2d · Good 6d · Easy 15d". */
export function preview(state: FsrsCard, now: Date = new Date()): Record<Rating, Date> {
  // A grade from a device clock ahead of this one would make the elapsed time negative.
  const at = state.last_review && state.last_review > now ? state.last_review : now;
  const all = scheduler.repeat(state, at);
  return {
    1: all[FsrsRating.Again].card.due,
    2: all[FsrsRating.Hard].card.due,
    3: all[FsrsRating.Good].card.due,
    4: all[FsrsRating.Easy].card.due,
  };
}

/** "1 min", "2 d", "6 d", "3 mo". For the small text under a grade button. */
export type IntervalUnit = "minute" | "hour" | "day" | "month" | "year";
export type Interval = { value: number; unit: IntervalUnit };

/** The interval in the largest unit that reads naturally. The client formats it for its locale. */
export function interval(from: Date, to: Date): Interval {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const min = Math.round(ms / 60_000);
  if (min < 60) return { value: Math.max(1, min), unit: "minute" };
  const hours = Math.round(min / 60);
  if (hours < 24) return { value: hours, unit: "hour" };
  const days = Math.round(hours / 24);
  if (days < 30) return { value: days, unit: "day" };
  const months = Math.round(days / 30);
  if (months < 12) return { value: months, unit: "month" };
  return { value: Math.round(days / 365), unit: "year" };
}

const SHORT_UNIT: Record<IntervalUnit, string> = {
  minute: "min",
  hour: "h",
  day: "d",
  month: "mo",
  year: "y",
};

/** English shorthand, for logs and tests. Interface code formats `interval()` for its locale. */
export function formatInterval(from: Date, to: Date): string {
  const { value, unit } = interval(from, to);
  return `${value} ${SHORT_UNIT[unit]}`;
}

/**
 * How likely the card is to come back if asked right now, 0 to 1. A card that has never been
 * reviewed has nothing to come back from, so it is 0 rather than the model's optimism.
 */
export function retrievability(state: FsrsCard, now: Date = new Date()): number {
  if (state.state === State.New || !state.last_review) return 0;
  return scheduler.get_retrievability(state, now, false);
}

/** Serialise for storage. Dates become ISO strings. */
export function serializeState(card: FsrsCard): string {
  return JSON.stringify(card);
}

export function deserializeState(json: string): FsrsCard {
  const raw = JSON.parse(json) as Record<string, unknown>;
  const card = { ...(raw as unknown as FsrsCard), due: new Date(raw.due as string) };
  if (raw.last_review) card.last_review = new Date(raw.last_review as string);
  else delete (card as Partial<FsrsCard>).last_review;
  // A card on the old two-step ladder would graduate on Forgot once the ladder has one step.
  card.learning_steps = Math.min(card.learning_steps, LEARNING_STEPS.length - 1);
  return card;
}
