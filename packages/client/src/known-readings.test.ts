import { markKnownReadings, parseReadings, type ReviewMode } from "@lymi/core";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import type { DeckRow } from "./deck-list";
import { resetGradeCache } from "./grades";
import { cachedKnownReadings, readingsFadedField } from "./known-readings";
import { deckCardsQuery, decksQuery } from "./queries";
import { OUTBOX_KEY } from "./queued";
import { configureForTest } from "./test/configure";

const store = new Map<string, string>();
configureForTest(store);

const RECOGNITION: ReviewMode = { cue: "term", target: "meaning" };
const PRODUCTION: ReviewMode = { cue: "meaning", target: "term" };
const YESTERDAY = "2026-10-16T09:00:00.000Z";

const row = (term: string, pronunciation: string, state: number | null): DeckRow =>
  ({
    card: { id: term, term, pronunciation, language: "ja" },
    state:
      state === null ? null : { state, mode: RECOGNITION, lastReview: state ? YESTERDAY : null },
  }) as unknown as DeckRow;

/** Grades this device made, as the outbox keeps them. */
const graded = (
  ...grades: {
    cardId: string;
    rating: number;
    stateAfter?: number;
    mode?: ReviewMode;
    undone?: boolean;
  }[]
) => {
  store.set(
    OUTBOX_KEY,
    JSON.stringify(
      grades.map((g, i) => ({
        mode: RECOGNITION,
        reviewedAt: `2026-10-17T10:00:0${i}.000Z`,
        ...g,
      })),
    ),
  );
  resetGradeCache();
};

const faded = (qc: QueryClient, example: string) =>
  markKnownReadings(parseReadings(example), cachedKnownReadings(qc).known)
    .filter((segment) => segment.known)
    .map((segment) => segment.text);

/** A learner studying one deck holding 食べる, Known, and 飲む, Learning. */
const studying = () => {
  const qc = new QueryClient();
  qc.setQueryData(decksQuery.queryKey, [{ id: "d" }] as never);
  qc.setQueryData(deckCardsQuery("d").queryKey, [
    row("食べる", "たべる", 2),
    row("飲む", "のむ", 1),
  ]);
  return qc;
};
const EXAMPLE = "水[みず]を飲[の]んで、パンを食[た]べる。";

beforeEach(() => {
  store.clear();
  resetGradeCache();
});

describe("cachedKnownReadings", () => {
  it("joins the Known cards of every cached deck the learner studies, shared ones too", () => {
    const qc = new QueryClient();
    qc.setQueryData(decksQuery.queryKey, [{ id: "own" }, { id: "shared" }] as never);
    qc.setQueryData(deckCardsQuery("own").queryKey, [
      row("食べる", "たべる", 2),
      row("飲む", "のむ", 1),
    ]);
    qc.setQueryData(deckCardsQuery("shared").queryKey, [row("毎朝", "まいあさ", 2)]);
    qc.setQueryData(deckCardsQuery("left").queryKey, [row("水", "みず", 2)]);
    expect(faded(qc, "毎朝[まいあさ]水[みず]を飲[の]んで、パンを食[た]べる。")).toEqual([
      "毎朝",
      "食",
    ]);
  });

  it("is complete only once the deck list and every deck's cards are cached", () => {
    const qc = new QueryClient();
    expect(cachedKnownReadings(qc).complete).toBe(false);
    qc.setQueryData(decksQuery.queryKey, [{ id: "a" }, { id: "b" }] as never);
    qc.setQueryData(deckCardsQuery("a").queryKey, [row("食べる", "たべる", 2)]);
    expect(cachedKnownReadings(qc)).toMatchObject({ complete: false });
    qc.setQueryData(deckCardsQuery("b").queryKey, []);
    expect(cachedKnownReadings(qc).complete).toBe(true);
  });

  it("stays the same state while what it says is the same, and changes when a card's state does", () => {
    const qc = studying();
    const first = cachedKnownReadings(qc);
    // A refetch or an edit elsewhere in the deck brings new rows that say the same.
    qc.setQueryData(deckCardsQuery("d").queryKey, [
      row("食べる", "たべる", 2),
      row("飲む", "のむ", 1),
      row("猫", "ねこ", 0),
    ]);
    expect(cachedKnownReadings(qc)).toBe(first);
    qc.setQueryData(deckCardsQuery("d").queryKey, [row("食べる", "たべる", 1)]);
    expect(cachedKnownReadings(qc).known.size).toBe(0);
  });

  it("takes Known away at once when this device grades the card Forgot, offline too", () => {
    const qc = studying();
    graded({ cardId: "食べる", rating: 1 });
    expect(faded(qc, EXAMPLE)).toEqual([]);
  });

  it("makes a card Known once the server has scheduled this device's grade as Known", () => {
    const qc = studying();
    graded({ cardId: "飲む", rating: 3 });
    expect(faded(qc, EXAMPLE)).toEqual(["食"]);
    graded({ cardId: "飲む", rating: 3, stateAfter: 2 });
    expect(faded(qc, EXAMPLE)).toEqual(["飲", "食"]);
  });

  it("ignores a grade taken back, one of the other side, and one older than the cached row", () => {
    const qc = studying();
    graded({ cardId: "食べる", rating: 1, undone: true });
    expect(faded(qc, EXAMPLE)).toEqual(["食"]);
    graded({ cardId: "食べる", rating: 1, mode: PRODUCTION });
    expect(faded(qc, EXAMPLE)).toEqual(["食"]);
    store.set(
      OUTBOX_KEY,
      JSON.stringify([
        { cardId: "食べる", mode: RECOGNITION, rating: 1, reviewedAt: "2026-10-15T09:00:00.000Z" },
      ]),
    );
    resetGradeCache();
    expect(faded(qc, EXAMPLE)).toEqual(["食"]);
  });
});

describe("readingsFadedField", () => {
  it("counts the example's faded readings once every deck is cached, a zero included", () => {
    const qc = studying();
    expect(readingsFadedField(qc, EXAMPLE)).toEqual({ readingsFaded: 1 });
    expect(readingsFadedField(qc, "毎朝[まいあさ]")).toEqual({ readingsFaded: 0 });
  });

  it("says nothing for an example without readings, or while a deck's cards are not cached", () => {
    const qc = studying();
    expect(readingsFadedField(qc, "パンを食べる。")).toEqual({});
    expect(readingsFadedField(qc, null)).toEqual({});
    qc.setQueryData(decksQuery.queryKey, [{ id: "d" }, { id: "e" }] as never);
    expect(readingsFadedField(qc, EXAMPLE)).toEqual({});
  });
});
