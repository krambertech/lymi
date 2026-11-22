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

export const LEARNING_STEPS = ["10m"] as const;

export const DESIRED_RETENTION = 0.9;

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

export function emptyState(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

export interface ScheduleResult {
  card: FsrsCard;
  log: {
    rating: Rating;
    state: State;
    due: Date;
    elapsedDays: number;
    scheduledDays: number;
    review: Date;
  };
}

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

export function preview(state: FsrsCard, now: Date = new Date()): Record<Rating, Date> {
  const at = state.last_review && state.last_review > now ? state.last_review : now;
  const all = scheduler.repeat(state, at);
  return {
    1: all[FsrsRating.Again].card.due,
    2: all[FsrsRating.Hard].card.due,
    3: all[FsrsRating.Good].card.due,
    4: all[FsrsRating.Easy].card.due,
  };
}

export type IntervalUnit = "minute" | "hour" | "day" | "month" | "year";
export type Interval = { value: number; unit: IntervalUnit };

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

export function retrievability(state: FsrsCard, now: Date = new Date()): number {
  if (state.state === State.New || !state.last_review) return 0;
  return scheduler.get_retrievability(state, now, false);
}

export function serializeState(card: FsrsCard): string {
  return JSON.stringify(card);
}

export function deserializeState(json: string): FsrsCard {
  const raw = JSON.parse(json) as Record<string, unknown>;
  const card = { ...(raw as unknown as FsrsCard), due: new Date(raw.due as string) };
  if (raw.last_review) card.last_review = new Date(raw.last_review as string);
  else delete (card as Partial<FsrsCard>).last_review;
  card.learning_steps = Math.min(card.learning_steps, LEARNING_STEPS.length - 1);
  return card;
}

export function readFsrs(state: { fsrs: string } | null): FsrsCard | null {
  if (!state) return null;
  try {
    const card = deserializeState(state.fsrs);
    return typeof card.stability === "number" ? card : null;
  } catch {
    return null;
  }
}
