import { describe, expect, it } from "vitest";
import { promptHash } from "../ai/prompt-hash";
import { supportedNamesIn } from "../languages/test-helpers";
import {
  type DeckCandidate,
  decksBrief,
  INSTRUCTIONS,
  LESSON_PROMPT_VERSION,
  REPLY_SCHEMA,
} from "./prompt";

const deck = (id: string, language: string | null): DeckCandidate => ({
  id,
  name: id,
  description: null,
  language,
  examples: [{ term: "term", meaning: "meaning" }],
});

/** One deck in each kind of language, so the hash covers every reading line and the brief's own wording. */
const DECKS = [
  deck("ja", "ja-JP"),
  deck("zh", "zh"),
  deck("ta", "ta"),
  deck("et", "et"),
  deck("none", null),
];
const brief = (decks: DeckCandidate[]) =>
  decksBrief(decks, { fixed: false, hint: undefined, meaningLanguage: "en", limit: 1 });

describe("the lesson prompt", () => {
  it("changes only with a new prompt version", () => {
    const hash = promptHash({ INSTRUCTIONS, REPLY_SCHEMA, brief: brief(DECKS) });
    // Raise LESSON_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ LESSON_PROMPT_VERSION, hash }).toEqual({
      LESSON_PROMPT_VERSION: 4,
      hash: "a32794a21b0752f8",
    });
  });

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
