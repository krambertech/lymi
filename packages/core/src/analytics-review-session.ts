import type { ProductAnalyticsEvent } from "./analytics";

type Snapshot = { cardsDone: number; cardCount: number; first: boolean };
export class ReviewSessionTracker {
  private completedFirst = false;
  private active: { id: string; key: string; baseline: number; snapshot: Snapshot } | null = null;
  constructor(
    private readonly send: (event: ProductAnalyticsEvent) => void,
    private readonly id: () => string,
  ) {}
  update(key: string, snapshot: Snapshot, start = true): void {
    if (this.active && this.active.key !== key) this.abandon("navigation");
    if (!this.active && !start) return;
    if (!this.active)
      this.active = {
        id: this.id(),
        key,
        baseline: snapshot.cardsDone,
        snapshot: {
          ...snapshot,
          first: snapshot.first && !this.completedFirst,
          cardCount: Math.max(0, snapshot.cardCount - snapshot.cardsDone),
        },
      };
    else
      this.active.snapshot = {
        ...snapshot,
        first: this.active.snapshot.first,
        cardCount: this.active.snapshot.cardCount,
      };
  }
  finish(ending: "goal" | "empty"): void {
    const active = this.active;
    if (!active) return;
    this.active = null;
    const cards = Math.max(0, active.snapshot.cardsDone - active.baseline);
    if (cards === 0) return;
    this.completedFirst = true;
    this.send({
      name: "review_session_finished",
      session_id: active.id,
      card_count: cards,
      is_first_session: active.snapshot.first,
      ending,
    });
  }
  abandon(reason: "left" | "navigation" | "pagehide"): void {
    const active = this.active;
    if (!active) return;
    this.active = null;
    if (active.snapshot.cardsDone > active.baseline) this.completedFirst = true;
    this.send({
      name: "review_session_abandoned",
      session_id: active.id,
      cards_done: Math.max(0, active.snapshot.cardsDone - active.baseline),
      card_count: active.snapshot.cardCount,
      is_first_session: active.snapshot.first,
      reason,
    });
  }
}
