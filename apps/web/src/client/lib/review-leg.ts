import type { ReviewScopeKind } from "@lymi/core/analytics";
import type { ReviewSessionTracker } from "@lymi/core/analytics-review-session";

/** Where the review screen's leg stands, as one step of its analytics. */
export interface ReviewLegStep {
  /** Changes when a new leg begins, so the last one is closed first. */
  key: string;
  snapshot: { cardsDone: number; cardCount: number; first: boolean; scope: ReviewScopeKind };
  /** The planned count while a card is presented, which the goal's stop can lower. */
  presentedCount: number;
  presenting: boolean;
  stopped: boolean;
  paused: boolean;
  finished: "goal" | "empty" | null;
}

/** Measures a review leg from the moment a card is presented, as the phone does. docs/analytics.md. */
export function stepReviewLeg(tracker: ReviewSessionTracker, step: ReviewLegStep): void {
  const { key, snapshot, presenting, stopped, paused, finished } = step;
  if (presenting) tracker.update(key, { ...snapshot, cardCount: step.presentedCount });
  else if (stopped) {
    tracker.update(key, snapshot, false);
    if (paused) tracker.abandon("left");
    else if (finished) tracker.finish(finished);
  }
}
