import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { ConfiguredTag, SupportedTag } from "@lymi/core";

interface LanguagePageRow {
  /** Its name in `localizedPages` and its address under `/languages`. */
  page: string;
  /** The footer link. */
  label: MessageDescriptor;
  /** Each title is its own message, because Ukrainian and Russian inflect a language's name. */
  title: MessageDescriptor;
  blurb: MessageDescriptor;
}

/**
 * Each language's page: every supported language, and a configured one given a page of its own.
 * Routes, the sitemap and the site links read this table, and `islands/LanguageView.tsx` names the
 * view that draws each one. docs/proposals/supported-languages.md.
 */
export const LANGUAGE_PAGES = {
  ja: {
    page: "japanese",
    label: msg`Japanese`,
    title: msg`Learn Japanese vocabulary with flashcards · Lymi`,
    blurb: msg`A free flashcard app for Japanese. Start with kana, then N5 and N4 words, and add the words from your own lessons. Cards show the reading over the kanji until you know the word.`,
  },
  zh: {
    page: "chinese",
    label: msg`Chinese`,
    title: msg`Learn Chinese vocabulary with flashcards · Lymi`,
    blurb: msg`A free flashcard app for Mandarin Chinese. Pinyin sits over each word until you know it, each reading of a character gets its own card, and your Pleco flashcards and free HSK 1 and HSK 2 decks come in whole.`,
  },
  uk: {
    page: "ukrainian",
    label: msg`Ukrainian`,
    title: msg`Learn Ukrainian vocabulary with flashcards · Lymi`,
    blurb: msg`A free flashcard app for Ukrainian. Each card marks its stress until you know the word, words told apart only by stress get a card each, and a native voice reads them. Start with the alphabet, then A1 and A2.`,
  },
  ru: {
    page: "russian",
    label: msg`Russian`,
    title: msg`Learn Russian vocabulary with flashcards · Lymi`,
    blurb: msg`A free flashcard app for Russian. Each card marks its stress until you know the word, words told apart only by stress get a card each, and a native voice reads them. Start with the alphabet, then A1 and the core words.`,
  },
  pl: {
    page: "polish",
    label: msg`Polish`,
    title: msg`Learn Polish vocabulary with flashcards · Lymi`,
    blurb: msg`A free flashcard app for Polish. A native voice reads every card, notes mark the words that only look like Ukrainian or Russian ones, and free decks follow the state exams from A1 to B1.`,
  },
} as const satisfies Record<SupportedTag, LanguagePageRow> &
  Partial<Record<ConfiguredTag, LanguagePageRow>>;

/** A language with a page here. */
export type LanguagePageTag = keyof typeof LANGUAGE_PAGES;

export type LanguagePageName = (typeof LANGUAGE_PAGES)[LanguagePageTag]["page"];

export const LANGUAGE_PAGE_TAGS = Object.keys(LANGUAGE_PAGES) as LanguagePageTag[];

/** The language whose page has this name, as `/languages/[language]` receives it. */
export function languageOfPage(name: string): LanguagePageTag | undefined {
  return LANGUAGE_PAGE_TAGS.find((tag) => LANGUAGE_PAGES[tag].page === name);
}

/** The published decks the Estonian page leads to, which keeps its own route until Estonian joins the table. */
export const ESTONIAN_PAGE_DECKS = [
  "everyday-estonian",
  "estonian-top-100-verbs",
  "estonian-top-1000-words",
] as const;
