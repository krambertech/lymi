import { randomUUID } from "expo-crypto";
import { useEffect, useRef } from "react";
import { useStreak } from "../data/queries";
import { captureEvent } from "./posthog";
import { type ReviewLeg, ReviewLegs } from "./review-legs";

export type { ReviewLeg };

/**
 * Measures review legs as the web does: a leg starts when a card is presented and ends at the
 * goal, a confirmed empty draw, a pause, or leaving the review. docs/analytics.md.
 */
export function useReviewSession(leg: ReviewLeg): void {
  const legs = useRef<ReviewLegs | null>(null);
  if (!legs.current)
    legs.current = new ReviewLegs((event) => {
      if (event.name === "review_session_finished") captureEvent(event.name, event);
      if (event.name === "review_session_abandoned") captureEvent(event.name, event);
    }, randomUUID);
  const streak = useStreak().data;
  useEffect(() => legs.current?.setStreak(streak), [streak]);
  const { key, date, scope, before, done, count, presenting, stopped, paused, finished } = leg;
  useEffect(() => {
    legs.current?.step({
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
    });
  }, [key, date, scope, before, done, count, presenting, stopped, paused, finished]);
  useEffect(() => {
    const session = legs.current;
    return () => session?.leave();
  }, []);
}
