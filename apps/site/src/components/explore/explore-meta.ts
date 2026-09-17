import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";

const TITLE = msg`Explore decks — Lymi`;
const DESCRIPTION = msg`Vocabulary decks written by a person and checked card by card: languages, exams, and whatever else is worth remembering. Add one and review it in your own language.`;

export function exploreTitle(i18n: I18n): string {
  return i18n._(TITLE);
}

export function exploreDescription(i18n: I18n): string {
  return i18n._(DESCRIPTION);
}
