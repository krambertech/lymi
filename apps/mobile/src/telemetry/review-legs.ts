import type { ProductAnalyticsEvent } from "@lymi/core/analytics";
import { ReviewSessionTracker } from "@lymi/core/analytics-review-session";

/** Where the review stands, as the screen draws it. */
export interface ReviewLeg {
  /** Changes when a new leg begins, so the last one is closed first; null before the first. */
  key: string | null;
  date: string | null;
  /** Today's attempts before this leg began. */
  before: number;
  done: number;
  count: number;
  presenting: boolean;
  stopped: boolean;
  paused: boolean;
  finished: "goal" | "empty" | null;
}

interface StreakDays {
  reviewedDays: number;
  today: { date: string; attempts: number };
}

/** Days reviewed before `date`, when the streak can tell. */
export function daysBefore(streak: StreakDays, date: string): number | undefined {
  if (streak.today.date === date) return streak.reviewedDays - (streak.today.attempts > 0 ? 1 : 0);
  // An older read proves an earlier review, but not that none happened since.
  if (streak.today.date < date && streak.reviewedDays > 0) return streak.reviewedDays;
  return undefined;
}

/**
 * Measures review legs as the web does, from the moment a card is presented. Whether it is the
 * learner's first session needs the streak, which may land late or never: until it says no day
 * came before, the leg counts as not the first. docs/analytics.md.
 */
export class ReviewLegs {
  private readonly tracker: ReviewSessionTracker;
  private streak: StreakDays | undefined;
  private date: string | null = null;

  constructor(send: (event: ProductAnalyticsEvent) => void, id: () => string) {
    this.tracker = new ReviewSessionTracker((event) => {
      if (event.name !== "review_session_finished" && event.name !== "review_session_abandoned")
        return;
      const earlier = this.streak && this.date ? daysBefore(this.streak, this.date) : undefined;
      send({ ...event, is_first_session: event.is_first_session && earlier === 0 });
    }, id);
  }

  setStreak(streak: StreakDays | undefined): void {
    if (streak) this.streak = streak;
  }

  step({ key, date, before, done, count, presenting, stopped, paused, finished }: ReviewLeg): void {
    if (key === null) return;
    const snapshot = { cardsDone: done, cardCount: count, first: before === 0 };
    // The leg being closed by a new key is reported under its own day, so the day moves after.
    if (presenting) this.tracker.update(key, snapshot);
    else if (stopped) {
      this.tracker.update(key, snapshot, false);
      if (paused) this.tracker.abandon("left");
      else if (finished) this.tracker.finish(finished);
    }
    this.date = date;
  }

  leave(): void {
    this.tracker.abandon("navigation");
  }
}
