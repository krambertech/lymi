import type { Rating, ReviewMode } from "@lymi/core";
import type { Card, Draw, QueueItem } from "../api";
import type { Recorded } from "../grades";
import { drawableLeft } from "../review-day";
import { drawState, type LocalGrade } from "../review-draw";
import {
  type FlowInputs,
  type FlowState,
  type FlowView,
  flowReducer,
  flowView,
  gradeRecord,
  type LastGrade,
  LOOKAHEAD,
  offerEvent,
  startFlow,
} from "./core";

export const DAY = 86_400_000;
export const start = new Date("2026-09-13T00:00:00Z");
export const end = new Date(start.getTime() + DAY);
export const noon = new Date("2026-09-13T12:00:00Z");
export const M: ReviewMode = { cue: "meaning", target: "term" };
export const next = {
  1: noon.toISOString(),
  2: noon.toISOString(),
  3: noon.toISOString(),
  4: noon.toISOString(),
};

export function card(id: string, deckId = "a") {
  return {
    card: { id, deckId, term: id } as Card,
    modes: [
      {
        mode: M,
        stateId: `s-${id}`,
        fsrsState: 2,
        due: new Date(start.getTime() - DAY).toISOString(),
        retrievability: 0.5,
        added: new Date(start.getTime() - 30 * DAY).toISOString(),
        hasCue: true,
        next,
      },
    ],
    slipping: false,
  };
}

export function draw(ids: string[], goal = 20): Draw & { fetchedAt: number } {
  return {
    day: { date: "2026-09-13", zone: "UTC", start: start.toISOString(), end: end.toISOString() },
    goal,
    attempts: 0,
    total: ids.length,
    cards: ids.map((id) => card(id)),
    log: [],
    fetchedAt: noon.getTime() - 60_000,
  };
}

export const itemOf = (id: string): QueueItem => ({
  card: card(id).card,
  mode: M,
  stateId: `s-${id}`,
  fsrsState: 2,
  next,
  slipping: false,
});

/** One review, driven through events as the shared hook drives it, over a draw held in hand. */
export class Review {
  flow: FlowState = startFlow();
  grades: LocalGrade[] = [];
  now = noon;
  over: Partial<FlowInputs> = {};
  private tick = 0;

  constructor(
    public data: FlowInputs["data"],
    over: Partial<FlowInputs> = {},
  ) {
    this.over = over;
    this.step();
  }

  /** A copy that can take other events, for walking every order of them. */
  clone(): Review {
    const copy = Object.assign(Object.create(Review.prototype) as Review, this);
    copy.grades = [...this.grades];
    return copy;
  }

  inputs(): FlowInputs {
    const { deck } = this.over.scope ?? {};
    const held = this.data && {
      ...this.data,
      cards: this.data.cards.filter((c) => !this.flow.archived.has(c.card.id)),
    };
    const state = held ? drawState(held, this.grades, this.now, deck, LOOKAHEAD) : undefined;
    return {
      scope: {},
      list: null,
      data: held,
      state,
      left: held && state ? drawableLeft(held, state, deck) : 0,
      drawFetching: false,
      unreachable: false,
      round: undefined,
      roundFetch: { updatedAt: 1, idle: true, failed: false },
      lastChange: Math.max(0, ...this.grades.map((g) => new Date(g.reviewedAt).getTime())),
      decks: [],
      scopeSection: undefined,
      decksLoading: false,
      streakSettled: true,
      daySatisfied: false,
      ...this.over,
    };
  }

  get view(): FlowView {
    return flowView(this.flow, this.inputs());
  }

  /** Runs what the view owes itself, as the hook's effects do. */
  step() {
    for (let i = 0; i < 5; i += 1) {
      const { steps } = this.view;
      if (steps.length === 0) return;
      for (const event of steps) this.flow = flowReducer(this.flow, event);
    }
    throw new Error("the review never settled");
  }

  /** Grades the card on screen, and leaves its send open. */
  grade(rating: Rating = 3): LastGrade {
    const view = this.view;
    const { data, state } = this.inputs();
    if (!view.current || !data || !state) throw new Error("no card on screen");
    this.tick += 1;
    const at = new Date(this.now.getTime() + this.tick * 1000).toISOString();
    const grade = gradeRecord(data, state, view.current, rating, at, {});
    const last = { item: view.current, grade, listed: view.leg?.kind !== "draw" };
    this.grades.push(grade);
    this.flow = flowReducer(this.flow, { type: "graded", last });
    this.step();
    return last;
  }

  settle(last: LastGrade, outcome: Recorded = "sent") {
    this.flow = flowReducer(this.flow, { type: "settled", last, outcome });
    this.flow = flowReducer(this.flow, { type: "sent" });
    if (outcome === "refused" || outcome === "gone") {
      this.grades = this.grades.filter((g) => g !== last.grade);
    }
    this.step();
  }

  /** A fetch begun now lands, with every grade so far in it. */
  fetched() {
    if (this.data) this.data = { ...this.data, fetchedAt: this.now.getTime() + 3_600_000 };
    this.step();
  }

  gradeAll(rating: Rating = 3) {
    while (this.view.current) this.settle(this.grade(rating));
  }

  dispatch(event: Parameters<typeof flowReducer>[1]) {
    this.flow = flowReducer(this.flow, event);
    this.step();
  }

  takeOffer(offer: Parameters<typeof offerEvent>[0]) {
    const event = offerEvent(offer, this.view, this.inputs());
    if (!event) throw new Error("no offer to take");
    this.dispatch(event);
  }
}

export const round = (ids: string[], total = ids.length): Partial<FlowInputs> => ({
  list: "round",
  round: { items: ids.map(itemOf), total },
});

export const heading = (view: FlowView) =>
  view.end && view.end !== "unchecked" ? view.end.heading : view.end;
