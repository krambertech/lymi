import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { FEATURED_DECKS, featuredDecks } from "./featured-decks";

const deck = (slug: string, withCard = true): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category: null,
  tags: [],
  language: null,
  meaningLanguage: "en",
  cardCount: 1,
  sectionCount: 0,
  card: withCard
    ? { term: "term", meaning: "meaning", section: null, mode: "term_to_meaning" }
    : null,
});

describe("featuredDecks", () => {
  it("keeps the featured order, whatever order the catalogue lists them in", () => {
    const [first, second] = FEATURED_DECKS as [string, string];
    const picked = featuredDecks([deck("other"), deck(second), deck(first)]);
    expect(picked.map((d) => d.slug).slice(0, 2)).toEqual([first, second]);
  });

  it("tops up from the catalogue when a locale lacks a featured deck, skipping decks with no card", () => {
    const picked = featuredDecks([deck("no-card", false), deck("estonian"), deck("finnish")]);
    expect(picked.map((d) => d.slug)).toEqual(["estonian", "finnish"]);
  });

  it("shows at most eight", () => {
    const many = Array.from({ length: 12 }, (_, i) => deck(`deck-${i}`));
    expect(featuredDecks(many)).toHaveLength(8);
  });
});
