import type { ProductAnalyticsEvent, ReviewScopeKind } from "@lymi/core/analytics";
import { ReviewSessionTracker } from "@lymi/core/analytics-review-session";
import { rememberReviewSessionOpened, reviewSessionAlreadyOpened } from "./opened";
import type { ReviewSource } from "./source";

/** Where the review stands, as the screen draws it. */
export interface ReviewLeg {
  /** Changes when a new leg begins, so the last one is closed first; null before the first. */
  key: string | null;
  date: string | null;
  /** What the leg was opened for. */
  scope: ReviewScopeKind;
  /** Today's attempts before this leg began. */
  before: number;
  done: number;
  count: number;
  presenting: boolean;
  stopped: boolean;
  paused: boolean;
  finished: "goal" | "empty" | null;
  /** How the cards arrived; `pending` while the decks have not loaded. */
  source?: ReviewSource | "pending";
}

interface StreakDays {
  reviewedDays: number;
  today: { date: string; attempts: number };
}

interface Opened {
  key: string;
  date: string;
  session_id: string;
  card_count: number;
  first: boolean;
  scope: ReviewScopeKind;
  source: ReviewSource | "pending";
}

/** Days reviewed before `date`, when the streak can tell. */
export function daysBefore(streak: StreakDays, date: string): number | undefined {
  if (streak.today.date === date) return streak.reviewedDays - (streak.today.attempts > 0 ? 1 : 0);
  // An older read proves an earlier review, but not that none happened since.
  if (streak.today.date < date && streak.reviewedDays > 0) return streak.reviewedDays;
  return undefined;
}

/**
 * Measures review legs from the moment a card is presented. Whether it is the learner's first
 * session needs the streak, which may land late or never: until it says no day
 * came before, the leg counts as not the first. docs/analytics.md.
 */
export class ReviewLegs {
  private readonly tracker: ReviewSessionTracker;
  private streak: StreakDays | undefined;
  private date: string | null = null;
  private pending: Opened | null = null;

  constructor(
    private readonly send: (event: ProductAnalyticsEvent) => void,
    id: () => string,
  ) {
    this.tracker = new ReviewSessionTracker((event) => {
      if (event.name !== "review_session_finished" && event.name !== "review_session_abandoned")
        return;
      send({ ...event, is_first_session: this.isFirst(event.is_first_session, this.date) });
    }, id);
  }

  setStreak(streak: StreakDays | undefined): void {
    if (streak) this.streak = streak;
    this.flushOpened();
  }

  step({
    key,
    date,
    scope,
    before,
    done,
    count,
    presenting,
    stopped,
    paused,
    finished,
    source = "own",
  }: ReviewLeg): void {
    if (key === null) return;
    const snapshot = { cardsDone: done, cardCount: count, first: before === 0, scope };
    // Flush a pending open for the last key first, so a navigation still records that it opened.
    if (this.pending && this.pending.key !== key) this.flushOpened(true);
    // The leg being closed by a new key is reported under its own day, so the day moves after.
    if (presenting) {
      const sessionId = this.tracker.update(key, snapshot);
      if (sessionId && date) this.queueOpened(key, date, sessionId, snapshot, source);
      else this.rememberSource(key, source);
      this.flushOpened();
    } else if (stopped) {
      this.rememberSource(key, source);
      // Only a real end flushes: running out of a page mid-round is not one.
      if (paused || finished) this.flushOpened(true);
      this.tracker.update(key, snapshot, false);
      if (paused) this.tracker.abandon("left");
      else if (finished) this.tracker.finish(finished);
    }
    this.date = date;
  }

  leave(reason: "navigation" | "pagehide" = "navigation"): void {
    this.flushOpened(true);
    this.tracker.abandon(reason);
  }

  private isFirst(first: boolean, date: string | null): boolean {
    const earlier = this.streak && date ? daysBefore(this.streak, date) : undefined;
    return first && earlier === 0;
  }

  private queueOpened(
    key: string,
    date: string,
    session_id: string,
    snapshot: { first: boolean; cardCount: number; cardsDone: number; scope: ReviewScopeKind },
    source: ReviewSource | "pending",
  ) {
    if (reviewSessionAlreadyOpened(key)) return;
    this.pending = {
      key,
      date,
      session_id,
      card_count: Math.max(0, snapshot.cardCount - snapshot.cardsDone),
      first: snapshot.first,
      scope: snapshot.scope,
      source,
    };
  }

  private rememberSource(key: string, source: ReviewSource | "pending") {
    if (this.pending?.key === key && source !== "pending") this.pending.source = source;
  }

  private flushOpened(ending = false) {
    const pending = this.pending;
    if (!pending) return;
    if (!ending && (pending.source === "pending" || !this.streak)) return;
    this.pending = null;
    if (reviewSessionAlreadyOpened(pending.key)) return;
    rememberReviewSessionOpened(pending.key);
    this.send({
      name: "review_session_opened",
      session_id: pending.session_id,
      scope: pending.scope,
      card_count: pending.card_count,
      is_first_session: this.isFirst(pending.first, pending.date),
      source: pending.source === "pending" ? "own" : pending.source,
    });
  }
}
