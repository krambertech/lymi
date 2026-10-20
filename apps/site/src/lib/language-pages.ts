import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { SupportedTag } from "@lymi/core";

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
 * Each supported language's page. Routes, the sitemap and the site links read this table, and
 * `islands/LanguageView.tsx` names the view that draws each one. docs/proposals/supported-languages.md.
 */
export const LANGUAGE_PAGES = {
  ja: {
    page: "japanese",
    label: msg`Japanese`,
    title: msg`Learn Japanese vocabulary with flashcards · Lymi`,
    blurb: msg`A free flashcard app for Japanese. Start with kana, then N5 and N4 words, and add the words from your own lessons. Cards show the reading over the kanji until you know the word.`,
  },
} as const satisfies Record<SupportedTag, LanguagePageRow>;

export type LanguagePageName = (typeof LANGUAGE_PAGES)[SupportedTag]["page"];

export const LANGUAGE_PAGE_TAGS = Object.keys(LANGUAGE_PAGES) as SupportedTag[];

/** The supported language whose page has this name, as `/languages/[language]` receives it. */
export function languageOfPage(name: string): SupportedTag | undefined {
  return LANGUAGE_PAGE_TAGS.find((tag) => LANGUAGE_PAGES[tag].page === name);
}

/** The published decks the Estonian page leads to, which keeps its own route until Estonian joins the table. */
export const ESTONIAN_PAGE_DECKS = [
  "everyday-estonian",
  "estonian-top-100-verbs",
  "estonian-top-1000-words",
] as const;
