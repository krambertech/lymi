import type { PublicDeckOut } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { pageI18n } from "../../lib/i18n";
import { faqPage } from "../../lib/structured-data";
import {
  CARDS_PER_SUBJECT_SECTION,
  deckIntro,
  deckQuestions,
  LISTED_SECTIONS,
  listedSections,
  WORDS_PER_SECTION,
} from "./deck-content";

const cards = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, at) => ({
    term: `${prefix} ${at + 1}`,
    meaning: `meaning ${at + 1}`,
    modes: ["term_to_meaning" as const],
  }));

const deck = (over: Partial<PublicDeckOut> = {}): PublicDeckOut => ({
  slug: "travel-greek",
  name: "Greek Essentials",
  summary: "Greek for a trip.",
  category: "languages",
  tags: [],
  language: "el",
  meaningLanguage: "en",
  originalMeaningLanguage: "en",
  editions: ["en"],
  publisher: "Lymi",
  publisherAvatar: null,
  sources: [],
  reviewedAt: null,
  revision: 1,
  publishedAt: "2026-09-10T12:00:00.000Z",
  cardCount: 30,
  sectionProgression: "automatic",
  sections: [
    { name: "Hello", cards: cards(11, "hello") },
    { name: "Help", cards: cards(19, "help") },
  ],
  ...over,
});

describe("listedSections", () => {
  it("lists the first words of each section and how many there are in all", () => {
    const listed = listedSections(deck());
    expect(listed.map((section) => [section.name, section.cards.length, section.total])).toEqual([
      ["Hello", WORDS_PER_SECTION, 11],
      ["Help", WORDS_PER_SECTION, 19],
    ]);
    expect(Object.keys(listed[0]?.cards[0] ?? {})).toEqual(["term", "meaning"]);
  });

  it("lists fewer cards for a subject deck and caps the sections", () => {
    const many = Array.from({ length: 20 }, (_, at) => ({ name: `S${at}`, cards: cards(9, "x") }));
    const listed = listedSections(deck({ category: "driving", sections: many }));
    expect(listed).toHaveLength(LISTED_SECTIONS);
    expect(listed[0]?.cards).toHaveLength(CARDS_PER_SUBJECT_SECTION);
  });
});

describe("deckIntro", () => {
  it("says what the deck holds and how its sections run, in each locale", () => {
    expect(deckIntro(pageI18n("en"), deck())[0]).toBe(
      "Greek Essentials has 30 Greek cards, each with its meaning in English. They come in 2 sections, from “Hello” to “Help”.",
    );
    expect(deckIntro(pageI18n("ru"), deck({ meaningLanguage: "ru" }))[0]).toBe(
      "В колоде «Greek Essentials» 30 карточек. Язык: греческий, перевод: русский. Они разбиты на 2 раздела, от «Hello» до «Help».",
    );
    const one = deck({ sections: [{ name: "Hello", cards: cards(1, "hi") }], cardCount: 1 });
    expect(deckIntro(pageI18n("uk"), one)[0]).toBe(
      "У колоді «Greek Essentials» 1 картка. Мова: грецька, переклад: англійська. Усі вони в одному розділі: «Hello».",
    );
  });
});

describe("deckQuestions", () => {
  it("answers in the page language, and the FAQPage repeats the visible answers", () => {
    const i18n = pageI18n("en");
    const questions = deckQuestions(deck());
    expect(i18n._(questions[0]?.question ?? "")).toBe("How many cards are in Greek Essentials?");
    expect(i18n._(questions[0]?.answer ?? "")).toMatch(/^30 cards in 2 sections\./);
    const schema = faqPage(questions, i18n, {
      name: "Greek Essentials",
      path: "/explore/travel-greek",
    });
    expect(schema.mainEntity.map((entry) => entry.acceptedAnswer.text)).toEqual(
      questions.map((question) => i18n._(question.answer)),
    );
    expect(pageI18n("ru")._(questions[1]?.answer ?? "")).toBe(
      "Да. Колоду можно добавить и учить бесплатно.",
    );
  });
});
