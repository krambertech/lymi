import type { PublicDeckOut } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { pageI18n } from "../../lib/i18n";
import { deckDescription, deckShareText, deckTitle } from "./deck-meta";

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
  sectionProgression: "automatic",
  sections: [],
  ...over,
});

const section = (name: string | null, cards: [string, string][]) => ({
  name,
  cards: cards.map(([term, meaning]) => ({
    term,
    meaning,
    modes: ["term_to_meaning" as const],
  })),
});

const turkish = (over: Partial<PublicDeckOut> = {}) =>
  deck({
    slug: "turkish-a1-vocabulary",
    name: "Turkish A1 Vocabulary",
    summary: "Turkish A1 words across everyday topics.",
    category: "languages",
    language: "tr",
    cardCount: 263,
    sections: [
      section("Meeting people", [
        ["merhaba", "hello / hi"],
        ["günaydın", "good morning"],
      ]),
      section("Pronouns", [["ben", "I"]]),
      section("Family", [["aile", "family"]]),
    ],
    ...over,
  });

const roadSigns = (over: Partial<PublicDeckOut> = {}) =>
  deck({
    slug: "german-road-signs",
    name: "German road signs (StVO)",
    summary: "Every sign by its number and name.",
    category: "driving",
    language: "de",
    cardCount: 162,
    sections: [
      section("Warning signs (Gefahrzeichen)", [["101", "Danger point"]]),
      section("Regulatory signs (Vorschriftzeichen)", [["206", "Stop"]]),
      section("Guidance signs (Richtzeichen)", [["306", "Priority road"]]),
    ],
    ...over,
  });

describe("deckTitle", () => {
  it("leads with the deck's name and its free cards, then Lymi", () => {
    expect(deckTitle(pageI18n("en"), turkish())).toBe(
      "Turkish A1 Vocabulary · 263 free flashcards · Lymi",
    );
    expect(deckTitle(pageI18n("en"), deck())).toBe("Periodic Table · 118 free flashcards · Lymi");
  });

  it("writes the count in the page language, with its plural", () => {
    const ru = turkish({ name: "Турецкая лексика A1", meaningLanguage: "ru" });
    expect(deckTitle(pageI18n("ru"), ru)).toBe(
      "Турецкая лексика A1 · 263 бесплатные карточки · Lymi",
    );
    expect(deckTitle(pageI18n("ru"), { ...ru, cardCount: 1 })).toBe(
      "Турецкая лексика A1 · 1 бесплатная карточка · Lymi",
    );
    expect(deckTitle(pageI18n("uk"), { ...ru, name: "Турецька лексика A1", cardCount: 25 })).toBe(
      "Турецька лексика A1 · 25 безкоштовних карток · Lymi",
    );
  });

  it("names the language first when the deck's name does not", () => {
    const greek = turkish({ name: "Island hopping", language: "el" });
    expect(deckTitle(pageI18n("en"), greek)).toBe(
      "Greek · Island hopping · 263 free flashcards · Lymi",
    );
  });

  it("finds the language in a name left in the deck's own language", () => {
    const core = deck({
      name: "Core Ukrainian Words",
      category: "languages",
      language: "uk",
      cardCount: 64,
    });
    expect(deckTitle(pageI18n("uk"), core)).toBe(
      "Core Ukrainian Words · 64 безкоштовні картки · Lymi",
    );
  });

  it("drops Lymi's name before it lets the title run past 60 characters", () => {
    const ru = roadSigns({ name: "Дорожные знаки Германии (StVO)", meaningLanguage: "ru" });
    expect(deckTitle(pageI18n("ru"), ru)).toBe(
      "Дорожные знаки Германии (StVO) · 162 бесплатные карточки",
    );
  });

  it("falls back to the bare name for a very long one", () => {
    const long = deck({ name: "A".repeat(58) });
    expect(deckTitle(pageI18n("en"), long)).toBe("A".repeat(58));
  });

  it("keeps every title within 60 characters", () => {
    for (const locale of ["en", "uk", "ru"]) {
      for (const each of [turkish(), roadSigns(), deck(), deck({ name: "B".repeat(80) })]) {
        expect([...deckTitle(pageI18n(locale), each)].length).toBeLessThanOrEqual(60);
      }
    }
  });
});

describe("deckDescription", () => {
  it("says what a language deck teaches, its free cards, and real words from it", () => {
    expect(deckDescription(pageI18n("en"), turkish())).toBe(
      "263 free Turkish flashcards with meanings in English. For example: merhaba (hello), ben (I), aile (family). Turkish A1 words across everyday topics.",
    );
  });

  it("reads naturally in Russian and Ukrainian", () => {
    const ru = turkish({ meaningLanguage: "ru", summary: "Слова уровня A1." });
    expect(deckDescription(pageI18n("ru"), ru)).toMatch(
      /^Турецкий: 263 бесплатные карточки, язык перевода: русский\. Например: merhaba \(hello\)/,
    );
    const uk = turkish({ meaningLanguage: "uk" });
    expect(deckDescription(pageI18n("uk"), uk)).toMatch(
      /^Турецька: 263 безкоштовні картки, мова перекладу: українська\./,
    );
  });

  it("quotes the summary only when it is written in the page language", () => {
    expect(deckDescription(pageI18n("ru"), turkish())).not.toContain("everyday topics");
  });

  it("quotes terms without their meanings when the meanings are in another language", () => {
    expect(deckDescription(pageI18n("uk"), turkish())).toContain("Наприклад: merhaba, ben, aile.");
    const signs = deckDescription(pageI18n("uk"), roadSigns());
    expect(signs).not.toContain("Warning signs");
    expect(signs).not.toContain("Danger point");
  });

  it("leads a subject deck with its summary and names its sections without the asides", () => {
    expect(deckDescription(pageI18n("en"), roadSigns())).toBe(
      "Every sign by its number and name. 162 free flashcards. Sections: Warning signs; Regulatory signs; Guidance signs.",
    );
  });

  it("keeps a long summary, by its first sentence or cut beside the count", () => {
    const civics = deck({
      category: "citizenship",
      cardCount: 128,
      summary:
        "US citizenship test practice: all 128 civics questions of the 2025 version, with the answers USCIS accepts and a short note on each. Study a few minutes a day.",
      sections: [],
    });
    expect(deckDescription(pageI18n("en"), civics)).toBe(
      "US citizenship test practice: all 128 civics questions of the 2025 version, with the answers USCIS accepts and a short note on each. 128 free flashcards.",
    );
    const state = deck({
      category: "citizenship",
      cardCount: 10,
      summary: `The ten questions for Bavaria ${"and more words ".repeat(12)}without a stop`,
      sections: [],
    });
    const line = deckDescription(pageI18n("en"), state);
    expect(line).toMatch(/^The ten questions for Bavaria .*… 10 free flashcards\.$/);
    expect([...line].length).toBeLessThanOrEqual(155);
  });

  it("does not say the meanings are in the language the deck teaches", () => {
    const nato = deck({ name: "NATO Phonetic Alphabet", category: "languages", language: "en" });
    expect(deckDescription(pageI18n("en"), nato)).toMatch(/^118 free English flashcards\./);
  });

  it("keeps every description within 155 characters", () => {
    const wordy = turkish({ summary: "Long. ".repeat(60) });
    for (const locale of ["en", "uk", "ru"]) {
      for (const each of [turkish(), roadSigns(), deck(), wordy]) {
        expect([...deckDescription(pageI18n(locale), each)].length).toBeLessThanOrEqual(155);
      }
    }
  });
});

describe("deckShareText", () => {
  it("leads with the subject where a language deck leads with its language", () => {
    expect(deckShareText(pageI18n("en"), deck()).facts).toBe("Science · 118 cards");
    const estonian = deck({ category: "languages", language: "et", cardCount: 2 });
    expect(deckShareText(pageI18n("en"), estonian).facts).toBe("Estonian · 2 cards");
  });
});
