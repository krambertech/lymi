import type { I18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { type PublicDeckOut, taughtLanguage } from "@lymi/core/catalog";
import { languageName } from "../../lib/deck-page";
import type { Question } from "../landing/faq";

/** How many sections the word list shows, and how many cards of each. */
export const LISTED_SECTIONS = 12;
export const WORDS_PER_SECTION = 8;
/** A subject deck's answers run longer than a word's meaning, so it lists fewer of each. */
export const CARDS_PER_SUBJECT_SECTION = 5;

export interface ListedSection {
  name: string | null;
  cards: { term: string; meaning: string | null }[];
  /** How many cards the section holds in all, beyond the few listed. */
  total: number;
}

/**
 * The first cards of each section, as plain text a crawler reads without opening anything. Only
 * what the page already loads for its full card list, so nothing here is new to the page.
 */
export function listedSections(deck: PublicDeckOut): ListedSection[] {
  const each = taughtLanguage(deck) ? WORDS_PER_SECTION : CARDS_PER_SUBJECT_SECTION;
  return deck.sections
    .filter((section) => section.cards.length > 0)
    .slice(0, LISTED_SECTIONS)
    .map((section) => ({
      name: section.name,
      cards: section.cards
        .slice(0, each)
        .map((card) => ({ term: card.term, meaning: card.meaning })),
      total: section.cards.length,
    }));
}

/** A short opening for the word list, written from the deck's facts in the page language. */
export function deckIntro(i18n: I18n, deck: PublicDeckOut): string[] {
  const name = deck.name;
  const count = deck.cardCount;
  const language = languageName(taughtLanguage(deck), i18n.locale);
  const meaningLanguage = languageName(deck.meaningLanguage, i18n.locale) ?? deck.meaningLanguage;
  const named = deck.sections.flatMap((section) => (section.name ? [section.name] : []));
  const sections = named.length;
  const first = named[0] ?? "";
  const last = named.at(-1) ?? "";
  const opening = language
    ? i18n._(
        msg`${name} has ${plural(count, { one: `# ${language} card`, other: `# ${language} cards` })}, each with its meaning in ${meaningLanguage}.`,
      )
    : i18n._(msg`${name} has ${plural(count, { one: "# card", other: "# cards" })}.`);
  const order =
    sections > 0
      ? i18n._(
          msg`${plural(sections, {
            1: `All of them are in one section, “${first}”.`,
            other: `They come in # sections, from “${first}” to “${last}”.`,
          })}`,
        )
      : "";
  const list = i18n._(
    msg`Below are the first cards of each section, so you can see what you would learn before you add the deck.`,
  );
  return [[opening, order].filter(Boolean).join(" "), list];
}

/** The deck page's questions. The page shows exactly these answers, and its FAQPage repeats them. */
export function deckQuestions(deck: PublicDeckOut): Question[] {
  const name = deck.name;
  const count = deck.cardCount;
  const sections = deck.sections.filter((section) => section.name !== null).length;
  return [
    {
      id: "size",
      question: msg`How many cards are in ${name}?`,
      answer:
        sections > 0
          ? msg`${plural(count, { one: "# card", other: "# cards" })} in ${plural(sections, { one: "# section", other: "# sections" })}. Every card is listed on this page, so you can see them all before you add the deck.`
          : msg`${plural(count, { one: "# card", other: "# cards" })}. Every card is listed on this page, so you can see them all before you add the deck.`,
    },
    {
      id: "free",
      question: msg`Is this deck free?`,
      answer: msg`Yes. You can add a deck and learn it for free.`,
    },
    {
      id: "schedule",
      question: msg`How does Lymi decide when to show a card again?`,
      answer: msg`It schedules every card with spaced repetition and brings it back right before you’d forget it.`,
    },
    {
      id: "phone",
      question: msg`Does it work on my phone?`,
      answer: msg`Yes. Lymi runs in the browser on your phone and your computer, and you can add it to your home screen. Your cards and progress are the same on both.`,
    },
  ];
}
