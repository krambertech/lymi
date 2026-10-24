import { createHash } from "node:crypto";
import { DECK_STYLE_MAX } from "@lymi/core";
import { describe, expect, it } from "vitest";
import {
  readStyle,
  STYLE_INSTRUCTIONS,
  STYLE_PROMPT_VERSION,
  STYLE_REPLY_SCHEMA,
  styleInput,
  topicAllowed,
} from "./style";

/** `count` cards, added `perDay` a day from the first of October. */
function cards(count: number, perDay = count) {
  return Array.from({ length: count }, (_, i) => ({
    day: `2026-10-${String(1 + Math.floor(i / perDay)).padStart(2, "0")}`,
    term: `word ${i}`,
  }));
}

describe("the style prompt", () => {
  it("changes only with a new prompt version", () => {
    const hash = createHash("sha256")
      .update(JSON.stringify({ STYLE_INSTRUCTIONS, STYLE_REPLY_SCHEMA }))
      .digest("hex")
      .slice(0, 16);
    // Raise STYLE_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ STYLE_PROMPT_VERSION, hash }).toEqual({
      STYLE_PROMPT_VERSION: 3,
      hash: "be8cd6403e7e1a0f",
    });
  });

  it("carries the enrichment prompt's own field rules as its defaults", () => {
    expect(STYLE_INSTRUCTIONS).toContain("## Defaults\nmeaning: the answer the learner tries");
    expect(STYLE_INSTRUCTIONS).not.toContain("## Examples\nLearn the reasoning");
  });
});

describe("topicAllowed", () => {
  it("lets a deck be named only with enough cards from separate days", () => {
    expect(topicAllowed(cards(15, 5))).toBe(true);
    expect(topicAllowed(cards(11, 4))).toBe(false);
  });

  it("never names a deck after one lesson, however many cards it brought", () => {
    // Twenty cards from two lessons.
    expect(topicAllowed(cards(20, 10))).toBe(false);
  });

  it("tells the model whether it may say what the deck is about", () => {
    const deck = { name: "Italiano", purpose: "language" as const, fields: ["meaning" as const] };
    const topic = (shown: ReturnType<typeof cards>) =>
      JSON.parse(
        styleInput({ meaningLanguage: "en", deck, previous: null, cards: shown, corrections: [] }),
      ).topic;
    expect(topic(cards(20, 10))).toBe(false);
    expect(topic(cards(15, 5))).toBe(true);
  });
});

describe("readStyle", () => {
  it("keeps the note, trimmed, and reads nothing worth saying as none", () => {
    expect(readStyle({ style: " - Meanings give the article. " })).toBe(
      "- Meanings give the article.",
    );
    expect(readStyle({ style: null })).toBeNull();
    expect(readStyle({ style: "  " })).toBeNull();
    expect(readStyle({ nope: true })).toBeNull();
    expect(readStyle(null)).toBeNull();
  });

  it("cuts a long note at the last whole line that fits", () => {
    const long = "- Meanings give the article and the plural.\n".repeat(60);
    const read = readStyle({ style: long }) ?? "";
    expect(read.length).toBeLessThanOrEqual(DECK_STYLE_MAX);
    expect(read.endsWith("plural.")).toBe(true);
    expect(readStyle({ style: "x".repeat(DECK_STYLE_MAX + 1) })).toBeNull();
  });
});
