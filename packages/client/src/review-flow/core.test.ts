import { modeKey, type Rating, type ReviewMode } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { Card, Draw, QueueItem } from "../api";
import type { Recorded } from "../grades";
import { drawableLeft } from "../review-day";
import { drawState, type LocalGrade } from "../review-draw";
import {
  cardKey,
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

const DAY = 86_400_000;
const start = new Date("2026-09-13T00:00:00Z");
const end = new Date(start.getTime() + DAY);
const noon = new Date("2026-09-13T12:00:00Z");
const M: ReviewMode = { cue: "meaning", target: "term" };
const next = {
  1: noon.toISOString(),
  2: noon.toISOString(),
  3: noon.toISOString(),
  4: noon.toISOString(),
};

function card(id: string, deckId = "a") {
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

function draw(ids: string[], goal = 20): Draw & { fetchedAt: number } {
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

const itemOf = (id: string): QueueItem => ({
  card: card(id).card,
  mode: M,
  stateId: `s-${id}`,
  fsrsState: 2,
  next,
  slipping: false,
});

/** One review, driven through events as the shared hook drives it, over a draw held in hand. */
class Review {
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

const round = (ids: string[], total = ids.length): Partial<FlowInputs> => ({
  list: "round",
  round: { items: ids.map(itemOf), total },
});

const heading = (view: FlowView) =>
  view.end && view.end !== "unchecked" ? view.end.heading : view.end;

describe("the first leg", () => {
  it("waits for the draw, then pins the first card", () => {
    const review = new Review(undefined);
    expect(review.view.leg).toBeNull();
    review.data = draw(["a", "b"]);
    review.step();
    expect(review.view.leg).toMatchObject({ kind: "draw", from: 0, until: 20 });
    expect(review.view.current?.card.id).toBeDefined();
  });

  it("waits for this mount's streak so the day is judged from now", () => {
    const review = new Review(draw(["a"]), { streakSettled: false });
    expect(review.view.leg).toBeNull();
  });

  it("gives a deck's review no stop at the goal", () => {
    const review = new Review(draw(["a"]), { scope: { deck: "a" } });
    expect(review.view.until).toBeNull();
  });

  it("marks a day that already counted", () => {
    const review = new Review(draw(["a"]), { daySatisfied: true });
    expect(review.flow.mark).toEqual({ attempts: 0, satisfied: true });
  });

  it("waits for a round's list and sizes the leg by its total", () => {
    const review = new Review(draw(["a"]), { list: "round", round: undefined });
    expect(review.view.leg).toBeNull();
    review.over = round(["a"], 80);
    review.step();
    expect(review.view.leg).toMatchObject({ kind: "list", size: 80 });
  });
});

describe("the card on screen", () => {
  it("stays put while a refetch lands", () => {
    const review = new Review(draw(["a", "b", "c"]));
    const shown = review.view.current?.card.id;
    review.data = draw(["c", "b", "a"]);
    review.step();
    expect(review.view.current?.card.id).toBe(shown);
  });

  it("gives way when a refetch no longer holds it", () => {
    const review = new Review(draw(["a", "b"]));
    const shown = review.view.current?.card.id;
    const other = shown === "a" ? "b" : "a";
    review.data = draw([other]);
    review.step();
    expect(review.view.current?.card.id).toBe(other);
  });

  it("moves on with a grade", () => {
    const review = new Review(draw(["a", "b"]));
    const shown = review.view.current?.card.id;
    review.settle(review.grade());
    expect(review.view.current?.card.id).not.toBe(shown);
    expect(review.view.position).toBe(1);
  });

  it("waits for today's draw past midnight", () => {
    const review = new Review(draw(["a"]), { drawFetching: true });
    review.settle(review.grade());
    review.now = new Date(end.getTime() + 1000);
    review.step();
    expect(review.view.current).toBeNull();
  });
});

describe("the goal's stop", () => {
  it("stops the day's draw at the goal, even with cards left", () => {
    const review = new Review(draw(["a", "b", "c"], 2));
    review.settle(review.grade());
    review.settle(review.grade());
    expect(review.view.current).toBeNull();
    expect(review.view.ending).toBe("goal");
    expect(heading(review.view)).toBe("goal_reached");
  });

  it("stops at a goal lowered on another device", () => {
    const review = new Review(draw(["a", "b", "c"], 3));
    review.settle(review.grade());
    review.data = draw(["a", "b", "c"], 1);
    review.step();
    expect(review.view.current).toBeNull();
    expect(review.view.ending).toBe("goal");
  });

  it("counts the header to the stop or the cards left, whichever is closer", () => {
    expect(new Review(draw(["a", "b", "c"], 2)).view.progress).toEqual({ done: 0, total: 2 });
    expect(new Review(draw(["a", "b"], 5)).view.progress).toEqual({ done: 0, total: 2 });
  });

  it("carries on past the goal once, with no second stop", () => {
    const review = new Review(draw(["a", "b", "c"], 1));
    review.settle(review.grade());
    review.takeOffer({ kind: "continue", to: "day", note: null });
    expect(review.view.until).toBeNull();
    expect(review.view.current).not.toBeNull();
  });
});

describe("past the goal", () => {
  it("keeps a round going over the goal, and its end says so", () => {
    const review = new Review(draw(["x", "y", "z"], 2), round(["x", "y", "z"]));
    review.settle(review.grade());
    review.settle(review.grade());
    expect(review.view.current?.card.id).toBe("z");
    review.settle(review.grade());
    review.fetched();
    expect(heading(review.view)).toBe("goal_reached");
  });

  it("runs a deck to its end past the goal", () => {
    const review = new Review(draw(["x", "y", "z"], 1), { scope: { deck: "a" } });
    review.settle(review.grade());
    expect(review.view.current).not.toBeNull();
    review.gradeAll();
    review.fetched();
    expect(heading(review.view)).toBe("goal_reached");
  });

  it("leads a round below the goal on to the goal's own stop", () => {
    const review = new Review(draw(["x", "y", "z"], 3), round(["x"]));
    review.settle(review.grade());
    review.fetched();
    review.takeOffer({ kind: "continue", to: "day", note: null });
    expect(review.view.leg).toMatchObject({ kind: "draw", from: 1, until: 3 });
    expect(review.view.progress).toEqual({ done: 0, total: 2 });
  });
});

describe("the end screen", () => {
  it("waits for a fetch begun after the last grade before it believes an empty draw", () => {
    const review = new Review(draw(["a"], 5));
    review.settle(review.grade());
    expect(review.view.end).toBeNull();
    expect(review.view.owesDrawFetch).toBe(true);
    review.fetched();
    expect(review.view.owesDrawFetch).toBe(false);
    expect(heading(review.view)).toBe("day_done");
  });

  it("reports unchecked when the empty draw cannot be confirmed offline", () => {
    const review = new Review(draw(["a"], 5), { unreachable: true });
    review.settle(review.grade());
    expect(review.view.owesDrawFetch).toBe(false);
    expect(review.view.end).toBe("unchecked");
  });

  it("waits for the last grade to land, so a refusal never takes an end back", () => {
    const review = new Review(draw(["a", "b"], 1));
    const last = review.grade();
    expect(review.view.stopped).toBe(true);
    expect(review.view.end).toBeNull();
    review.settle(last);
    expect(review.view.end).not.toBeNull();
  });

  it("ends offline without waiting on a send", () => {
    const review = new Review(draw(["a", "b"], 1), { unreachable: true });
    review.grade();
    expect(review.view.end).not.toBeNull();
  });

  it("waits for the decks outside a scoped review", () => {
    const review = new Review(draw(["a"]), {
      scope: { deck: "a" },
      decksLoading: true,
      decks: [{ id: "b", due: 4 }],
    });
    review.settle(review.grade());
    review.fetched();
    expect(review.view.end).toBeNull();
    review.over = { ...review.over, decksLoading: false };
    expect(heading(review.view)).toBe("scope_done");
  });

  it("counts a section's deck mates as elsewhere", () => {
    const review = new Review(draw(["a"]), {
      scope: { deck: "a", section: "s" },
      decks: [{ id: "a", due: 7 }],
      scopeSection: { due: 1 },
    });
    review.settle(review.grade());
    review.fetched();
    const end = review.view.end;
    expect(end).toMatchObject({
      offers: [{ kind: "continue", to: "day", note: { kind: "decks" } }],
    });
  });

  it("offers the forgotten cards at the end", () => {
    const review = new Review(draw(["a", "b"], 2));
    review.settle(review.grade(1));
    review.settle(review.grade(3));
    expect(review.view.forgotten).toHaveLength(1);
    review.takeOffer({ kind: "forgotten", count: 1 });
    expect(review.view.leg?.kind).toBe("forgotten");
    expect(review.view.current).not.toBeNull();
    review.settle(review.grade());
    review.fetched();
    expect(review.view.legReport.finished).toBe("empty");
  });
});

describe("leaving partway", () => {
  it("ends on the end screen, and Continue picks up the same card", () => {
    const review = new Review(draw(["a", "b", "c"], 10));
    review.settle(review.grade());
    const waiting = review.view.current?.card.id;
    review.dispatch({ type: "paused" });
    expect(review.view.current).toBeNull();
    expect(review.view.ending).toBe("left");
    expect(review.view.end).not.toBeNull();
    review.takeOffer({ kind: "continue", to: "resume", note: null });
    expect(review.view.current?.card.id).toBe(waiting);
    expect(review.view.added).toBe(false);
  });

  it("measures the time after Continue as another leg", () => {
    const review = new Review(draw(["a", "b", "c"], 10));
    review.settle(review.grade());
    const first = review.view.legReport.key;
    review.dispatch({ type: "paused" });
    review.takeOffer({ kind: "continue", to: "resume", note: null });
    expect(review.view.legReport.key).not.toBe(first);
  });
});

describe("a list leg", () => {
  it("picks up where it was after leaving", () => {
    const review = new Review(draw(["a"]), round(["a", "b", "c"]));
    review.settle(review.grade());
    review.dispatch({ type: "paused" });
    expect(review.view.current).toBeNull();
    review.takeOffer({ kind: "continue", to: "resume", note: null });
    expect(review.view.current?.card.id).toBe("b");
    expect(review.view.progress).toEqual({ done: 1, total: 3 });
  });

  it("sends a refused card to the end of the list", () => {
    const review = new Review(draw(["a"]), round(["a", "b", "c"]));
    const refused = review.grade();
    review.settle(refused, "refused");
    expect(review.view.current?.card.id).toBe("b");
    review.settle(review.grade());
    review.settle(review.grade());
    expect(review.view.current?.card.id).toBe("a");
  });

  it("takes a gone card out of the count", () => {
    const review = new Review(draw(["a"]), round(["a", "b"]));
    review.settle(review.grade(), "gone");
    expect(review.view.progress).toEqual({ done: 0, total: 1 });
  });

  it("asks once for the round when a page runs out, and the end waits for it", () => {
    const review = new Review(draw(["a"]), round(["a"], 2));
    review.settle(review.grade());
    review.fetched();
    const ask = review.view.askRound;
    expect(ask).not.toBeNull();
    expect(review.view.end).toBeNull();
    if (ask) review.dispatch({ type: "asked", ask });
    expect(review.view.askRound).toBeNull();
    expect(review.view.end).toBeNull();
    // The fetch lands with nothing new: a card left the round meanwhile.
    review.over = { ...review.over, roundFetch: { updatedAt: 2, idle: true, failed: false } };
    expect(review.view.end).not.toBeNull();
    expect(review.view.legReport.finished).toBe("empty");
  });

  it("does not finish when the round's fetch fails", () => {
    const review = new Review(draw(["a"]), round(["a"], 2));
    review.settle(review.grade());
    review.fetched();
    review.over = { ...review.over, roundFetch: { updatedAt: 1, idle: true, failed: true } };
    expect(review.view.end).not.toBeNull();
    expect(review.view.legReport.finished).toBeNull();
  });

  it("reports a chosen list under its own scope", () => {
    const review = new Review(draw(["a"]), { ...round(["a"]), list: "chosen" });
    expect(review.view.legReport.scope).toBe("chosen");
  });
});

describe("archiving during a review", () => {
  it("takes the card out at once, and restore brings it back", () => {
    const review = new Review(draw(["a", "b"]));
    const shown = review.view.current?.card.id ?? "";
    review.dispatch({ type: "archived", cardId: shown, keys: [] });
    expect(review.view.current?.card.id).not.toBe(shown);
    review.dispatch({
      type: "restored",
      cardId: shown,
      keys: [],
      pin: { cardId: shown, mode: modeKey(M) },
    });
    expect(review.flow.archived.size).toBe(0);
    expect(review.view.current?.card.id).toBe(shown);
  });

  it("drops it from a round's count", () => {
    const review = new Review(draw(["a"]), round(["a", "b"]));
    const keys = [cardKey(itemOf("a"))];
    review.dispatch({ type: "archived", cardId: "a", keys });
    expect(review.view.current?.card.id).toBe("b");
    expect(review.view.progress?.total).toBe(1);
    review.dispatch({ type: "restored", cardId: "a", keys });
    expect(review.view.current?.card.id).toBe("a");
    expect(review.view.progress?.total).toBe(2);
  });
});

describe("Undo", () => {
  it("brings the last card back on screen", () => {
    const review = new Review(draw(["a", "b"]));
    const last = review.grade();
    review.grades = review.grades.filter((g) => g !== last.grade);
    review.dispatch({ type: "undone", last });
    expect(review.view.current?.card.id).toBe(last.item.card.id);
    expect(review.view.position).toBe(0);
    expect(review.flow.last).toBeNull();
  });

  it("ignores the answer to a grade taken back while its send was pending", () => {
    const review = new Review(draw(["a"]), round(["a", "b"]));
    const last = review.grade();
    review.dispatch({ type: "undone", last });
    review.settle(last, "refused");
    expect(review.flow.cards.returned.size).toBe(0);
    expect(review.view.current?.card.id).toBe("a");
  });

  it("steps forward again when the server keeps the grade", () => {
    const review = new Review(draw(["a"]), round(["a", "b"]));
    const last = review.grade();
    review.dispatch({ type: "undone", last });
    review.dispatch({ type: "undoRefused", last, step: true });
    expect(review.view.current?.card.id).toBe("b");
    expect(review.view.position).toBe(1);
    expect(review.view.progress?.done).toBe(1);
  });

  it("stays put when a new grade came before the refusal", () => {
    const review = new Review(draw(["a"]), round(["a", "b"]));
    const last = review.grade();
    review.dispatch({ type: "undone", last });
    const again = review.grade();
    review.dispatch({ type: "undoRefused", last, step: false });
    expect(review.flow.last).toBe(again);
    expect(review.view.position).toBe(1);
  });
});

describe("a new day", () => {
  it("opens a fresh leg once today's draw lands", () => {
    const review = new Review(draw(["a", "b"]));
    review.settle(review.grade());
    review.now = new Date(end.getTime() + 1000);
    review.grades = [];
    const startNext = new Date(end.getTime() + DAY);
    const today = draw(["b"]);
    review.data = {
      ...today,
      day: {
        date: "2026-09-14",
        zone: "UTC",
        start: end.toISOString(),
        end: startNext.toISOString(),
      },
    };
    review.step();
    expect(review.view.leg).toMatchObject({ date: "2026-09-14", from: 0 });
    expect(review.flow.mark?.attempts).toBe(0);
  });
});
