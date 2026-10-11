import { REVIEW_TIME_LIMIT_MS } from "@lymi/core";
import { focusManager } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export interface RecallTimes {
  recallMs?: number;
  gradeMs?: number;
}

/** Whether the review is in the foreground, and a way to hear it change. */
export interface Foreground {
  visible(): boolean;
  subscribe(listener: (visible: boolean) => void): () => void;
}

/**
 * Query's focus manager already follows the tab's visibility on the web and the app's state on the
 * phone, so the clock pauses on exactly what pauses a refetch.
 */
const queryForeground: Foreground = {
  visible: () => focusManager.isFocused(),
  subscribe: (listener) => focusManager.subscribe(listener),
};

const measured = (ms: number) => (ms <= REVIEW_TIME_LIMIT_MS ? Math.round(ms) : undefined);

/** Counts the foreground time a card spends unrevealed, then revealed, until its grade. */
export class RecallClock {
  private elapsed = 0;
  private since: number | null = null;
  private recall: number | null = null;

  constructor(
    private readonly foreground: Foreground = queryForeground,
    private readonly now: () => number = () => performance.now(),
  ) {}

  /** Hears the foreground come and go; returns the way to stop. */
  watch(): () => void {
    return this.foreground.subscribe((visible) => (visible ? this.resume() : this.pause()));
  }

  /** The cue is on screen: a fresh count for a fresh card. */
  start() {
    this.elapsed = 0;
    this.recall = null;
    this.since = this.foreground.visible() ? this.now() : null;
  }

  reveal() {
    if (this.recall !== null) return;
    this.recall = this.read();
    this.elapsed = 0;
    if (this.since !== null) this.since = this.now();
  }

  /** The times to send with the grade; a grade with no reveal before it is all recall. */
  stop(): RecallTimes {
    const last = measured(this.read());
    const recallMs = this.recall === null ? last : measured(this.recall);
    const gradeMs = this.recall === null ? undefined : last;
    this.start();
    return {
      ...(recallMs !== undefined ? { recallMs } : {}),
      ...(gradeMs !== undefined ? { gradeMs } : {}),
    };
  }

  private read() {
    return this.elapsed + (this.since === null ? 0 : this.now() - this.since);
  }

  private pause() {
    this.elapsed = this.read();
    this.since = null;
  }

  private resume() {
    if (this.since === null) this.since = this.now();
  }
}

/**
 * Starts the clock as each card arrives, marks the reveal, and returns what reads the times at the
 * grade. `card` names the card on screen, including its place, so a card that comes straight back
 * starts again.
 */
export function useRecallClock(card: string | null, revealed: boolean): () => RecallTimes {
  const [clock] = useState(() => new RecallClock());
  useEffect(() => clock.watch(), [clock]);
  useEffect(() => {
    if (card) clock.start();
  }, [clock, card]);
  useEffect(() => {
    if (revealed) clock.reveal();
  }, [clock, revealed]);
  return useCallback(() => clock.stop(), [clock]);
}
