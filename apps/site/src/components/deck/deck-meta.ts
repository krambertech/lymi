import type { I18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { type PublicDeckOut, taughtLanguage } from "@lymi/core/catalog";
import { languageName } from "../../lib/deck-page";
import { deckSubject } from "../../lib/subjects";

/** The deck's title for the tab and search results: its name, then the language it teaches or its subject. */
export function deckTitle(i18n: I18n, deck: PublicDeckOut): string {
  const name = deck.name;
  const language = languageName(taughtLanguage(deck), i18n.locale);
  if (language) return i18n._(msg`${name} · ${language} vocabulary · Lymi`);
  const subject = deckSubject(i18n, deck);
  if (subject) return i18n._(msg`${name} · ${subject} · Lymi`);
  return i18n._(msg`${name} · Flashcards · Lymi`);
}

/** Written from the deck's facts so it reads in the page language, whatever the deck is in. */
export function deckDescription(i18n: I18n, deck: PublicDeckOut): string {
  const count = deck.cardCount;
  const language = languageName(taughtLanguage(deck), i18n.locale);
  const meaningLanguage = languageName(deck.meaningLanguage, i18n.locale) ?? deck.meaningLanguage;
  if (language) {
    return i18n._(
      msg`${plural(count, { one: `# ${language} card`, other: `# ${language} cards` })} with meanings in ${meaningLanguage}. Try a few, then add the deck to Lymi to review them all.`,
    );
  }
  return i18n._(
    msg`${plural(count, { one: "# card", other: "# cards" })}. Try a few, then add the deck to Lymi to review them all.`,
  );
}

export const UNAVAILABLE_TITLE = msg`This deck is no longer published · Lymi`;
export const UNAVAILABLE_BLURB = msg`Its publisher took it off Lymi’s public pages.`;
export const MISSING_TITLE = msg`No deck at this address · Lymi`;
export const MISSING_BLURB = msg`The link may have a typo, or this deck was never published.`;

/** What the deck's link preview says, in the page language: its name, its facts and who made it. */
export function deckShareText(
  i18n: I18n,
  deck: PublicDeckOut,
): { name: string; facts: string; byline: string; alt: string } {
  const name = deck.name;
  const publisher = deck.publisher;
  const shelf =
    languageName(taughtLanguage(deck), i18n.locale, { label: true }) ?? deckSubject(i18n, deck);
  const cards = i18n._(msg`${plural(deck.cardCount, { one: "# card", other: "# cards" })}`);
  const facts = [shelf, cards].filter(Boolean).join(" · ");
  return {
    name,
    facts,
    byline: i18n._(msg`By ${publisher}`),
    alt: i18n._(msg`${name} on Lymi: ${facts}`),
  };
}
