import type { PublicDeckOut } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { pageI18n } from "../../lib/i18n";
import { deckShareText, deckTitle } from "./deck-meta";

const deck = (over: Partial<PublicDeckOut> = {}): PublicDeckOut => ({
  slug: "periodic-table",
  name: "Periodic Table",
  summary: "Every element by its symbol.",
  category: "science",
  tags: [],
  language: null,
  meaningLanguage: "en",
  originalMeaningLanguage: "en",
  editions: ["en"],
  publisher: "Lymi",
  publisherAvatar: null,
  sources: [],
  reviewedAt: null,
  revision: 1,
  publishedAt: "2026-09-10T12:00:00.000Z",
  cardCount: 118,
  sections: [],
  ...over,
});

describe("deckTitle", () => {
  it("names a deck that teaches no language by its subject, in every locale", () => {
    expect(deckTitle(pageI18n("en"), deck())).toBe("Periodic Table · Science · Lymi");
    expect(deckTitle(pageI18n("uk"), deck())).toBe("Periodic Table · Наука · Lymi");
    expect(deckTitle(pageI18n("ru"), deck())).toBe("Periodic Table · Наука · Lymi");
  });

  it("never calls a subject deck a language's vocabulary, whatever its terms are spoken in", () => {
    expect(deckTitle(pageI18n("en"), deck({ language: "en" }))).toBe(
      "Periodic Table · Science · Lymi",
    );
  });

  it("names the language a language deck teaches", () => {
    const spanish = deck({ name: "Spanish A1", category: "languages", language: "es" });
    expect(deckTitle(pageI18n("en"), spanish)).toBe("Spanish A1 · Spanish vocabulary · Lymi");
  });

  it("falls back to flashcards for a deck with neither a language nor a subject", () => {
    expect(deckTitle(pageI18n("en"), deck({ category: "exams" }))).toBe(
      "Periodic Table · Flashcards · Lymi",
    );
  });
});

describe("deckShareText", () => {
  it("leads with the subject where a language deck leads with its language", () => {
    expect(deckShareText(pageI18n("en"), deck()).facts).toBe("Science · 118 cards");
    const estonian = deck({ category: "languages", language: "et", cardCount: 2 });
    expect(deckShareText(pageI18n("en"), estonian).facts).toBe("Estonian · 2 cards");
  });
});
