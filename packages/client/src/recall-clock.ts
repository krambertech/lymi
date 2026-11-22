import { REVIEW_TIME_LIMIT_MS } from "@lymi/core";
import { focusManager } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export interface RecallTimes {
  recallMs?: number;
  gradeMs?: number;
}

export interface Foreground {
  visible(): boolean;
  subscribe(listener: (visible: boolean) => void): () => void;
}

const queryForeground: Foreground = {
  visible: () => focusManager.isFocused(),
  subscribe: (listener) => focusManager.subscribe(listener),
};

const measured = (ms: number) => (ms <= REVIEW_TIME_LIMIT_MS ? Math.round(ms) : undefined);

export class RecallClock {
  private elapsed = 0;
  private since: number | null = null;
  private recall: number | null = null;

  constructor(
    private readonly foreground: Foreground = queryForeground,
    private readonly now: () => number = () => performance.now(),
  ) {}

  watch(): () => void {
    return this.foreground.subscribe((visible) => (visible ? this.resume() : this.pause()));
  }

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
