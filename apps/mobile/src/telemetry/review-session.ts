import { ReviewSessionTracker } from "@lymi/core/analytics-review-session";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef } from "react";
import { useStreak } from "../data/queries";
import { captureEvent } from "./posthog";

export interface ReviewLeg {
  /** Changes when a new leg begins, so the last one is closed first; null before the first. */
  key: string | null;
  done: number;
  count: number;
  presenting: boolean;
  stopped: boolean;
  paused: boolean;
  finished: "goal" | "empty" | null;
}

/**
 * Measures review legs as the web does: a leg starts when a card is presented and ends at the
 * goal, a confirmed empty draw, a pause, or leaving the review. docs/analytics.md.
 */
export function useReviewSession({
  key,
  done,
  count,
  presenting,
  stopped,
  paused,
  finished,
}: ReviewLeg): void {
  const tracker = useRef<ReviewSessionTracker | null>(null);
  if (!tracker.current)
    tracker.current = new ReviewSessionTracker((event) => {
      if (event.name === "review_session_finished") captureEvent(event.name, event);
      if (event.name === "review_session_abandoned") captureEvent(event.name, event);
    }, randomUUID);
  const streak = useStreak();
  const settled = streak.isFetchedAfterMount || streak.fetchStatus !== "fetching";
  const first = useRef<boolean | null>(null);
  useEffect(() => {
    if (first.current === null && settled && streak.data)
      first.current = streak.data.reviewedDays === 0 && streak.data.today.attempts === 0;
    const session = tracker.current;
    if (!session || key === null || first.current === null) return;
    const snapshot = { cardsDone: done, cardCount: count, first: first.current };
    if (presenting) session.update(key, snapshot);
    else if (stopped) {
      session.update(key, snapshot, false);
      if (paused) session.abandon("left");
      else if (finished) session.finish(finished);
    }
  }, [key, done, count, presenting, stopped, paused, finished, settled, streak.data]);
  useEffect(() => {
    const session = tracker.current;
    return () => session?.abandon("navigation");
  }, []);
}
