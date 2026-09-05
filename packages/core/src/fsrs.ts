import {
  createEmptyCard,
  type Card as FsrsCard,
  Rating as FsrsRating,
  fsrs,
  type Grade,
  generatorParameters,
  State,
} from "ts-fsrs";
import type { Direction, Directions, Rating } from "./types";

export type { FsrsCard };
export { State };

/**
 * One scheduler for the whole app. Parameters are the FSRS defaults for now;
 * once there is review history they can be optimised per user.
 */
const scheduler = fsrs(
  generatorParameters({
    enable_fuzz: true,
    // Cards graduate to Review after these learning steps.
    learning_steps: ["1m", "10m"],
    relearning_steps: ["10m"],
  }),
);

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
  const all = scheduler.repeat(state, now);
  return {
    1: all[FsrsRating.Again].card.due,
    2: all[FsrsRating.Hard].card.due,
    3: all[FsrsRating.Good].card.due,
    4: all[FsrsRating.Easy].card.due,
  };
}

/** "1 min", "2 d", "6 d", "3 mo". For the small text under a grade button. */
export function formatInterval(from: Date, to: Date): string {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} mo`;
  return `${Math.round(days / 365)} y`;
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
  return card;
}

/** "both" expands to the two concrete directions a card state row can have. */
export function expandDirections(d: Directions): Direction[] {
  return d === "both" ? ["recognition", "production"] : [d];
}
