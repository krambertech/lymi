import { describe, expect, it } from "vitest";
import { supportedNamesIn } from "../languages/test-helpers";
import { type DeckCandidate, decksBrief, INSTRUCTIONS } from "./prompt";

const deck = (id: string, language: string | null): DeckCandidate => ({
  id,
  name: id,
  description: null,
  language,
  examples: [{ term: "term", meaning: "meaning" }],
});

const brief = (decks: DeckCandidate[]) =>
  decksBrief(decks, { fixed: false, hint: undefined, meaningLanguage: "en", limit: 1 });

describe("the lesson prompt", () => {
  it("leaves each supported language to its module", () => {
    expect(supportedNamesIn(INSTRUCTIONS)).toEqual([]);
  });
});

describe("decksBrief", () => {
  it("says what a reading looks like only for a deck whose language has a rule", () => {
    expect(brief([deck("ja", "ja")])).toContain(
      "Deck ja: ja, teaching Japanese\n  Readings: furigana over or beside kanji, a kana gloss in brackets.\n  term — meaning",
    );
    expect(brief([deck("zh", "zh-TW")])).toContain(
      "  Readings: pinyin over, under or beside the hanzi",
    );
    expect(brief([deck("et", "et")])).not.toContain("Readings:");
  });
});
