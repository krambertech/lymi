import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";

const TITLE = msg`Free flashcard decks — languages, exams and more · Lymi`;
const DESCRIPTION = msg`Ready-made flashcard decks, written by a person and checked card by card: languages, exams, and whatever else is worth remembering. Add one free and review it in your own language, a few minutes a day.`;

export function exploreTitle(i18n: I18n): string {
  return i18n._(TITLE);
}

export function exploreDescription(i18n: I18n): string {
  return i18n._(DESCRIPTION);
}

/** Explore's name where a page points back at it, the same word the navigation uses. */
export const EXPLORE_NAME = msg`Explore`;
