import { markKnownReadings, parseReadings } from "@lymi/core";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { DeckRow } from "./deck-list";
import { cachedKnownReadings } from "./known-readings";
import { deckCardsQuery, decksQuery } from "./queries";

const row = (term: string, pronunciation: string, state: number | null): DeckRow =>
  ({
    card: { id: term, term, pronunciation, language: "ja" },
    state: state === null ? null : { state },
  }) as unknown as DeckRow;

const faded = (qc: QueryClient, example: string) =>
  markKnownReadings(parseReadings(example), cachedKnownReadings(qc))
    .filter((segment) => segment.known)
    .map((segment) => segment.text);

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

  it("stays the same set until a deck's cards change", () => {
    const qc = new QueryClient();
    qc.setQueryData(deckCardsQuery("d").queryKey, [row("食べる", "たべる", 2)]);
    const first = cachedKnownReadings(qc);
    expect(cachedKnownReadings(qc)).toBe(first);
    qc.setQueryData(deckCardsQuery("d").queryKey, [row("食べる", "たべる", 1)]);
    expect(cachedKnownReadings(qc)).not.toBe(first);
    expect(cachedKnownReadings(qc).size).toBe(0);
  });
});
