import type { I18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import type { PublicDeckOut } from "@lymi/core/catalog";
import { languageName } from "../../lib/deck-page";

/** The deck's title for the tab and search results: its name, what it teaches and the level. */
export function deckTitle(i18n: I18n, deck: PublicDeckOut): string {
  const name = deck.name;
  const level = deck.level;
  const language = languageName(deck.language, i18n.locale);
  if (language && level)
    return i18n._(msg`${name} · ${language} vocabulary, level ${level} · Lymi`);
  if (language) return i18n._(msg`${name} · ${language} vocabulary · Lymi`);
  return i18n._(msg`${name} · Vocabulary cards · Lymi`);
}

/** Written from the deck's facts so it reads in the page language, whatever the deck is in. */
export function deckDescription(i18n: I18n, deck: PublicDeckOut): string {
  const count = deck.cardCount;
  const level = deck.level;
  const language = languageName(deck.language, i18n.locale);
  const meaningLanguage = languageName(deck.meaningLanguage, i18n.locale) ?? deck.meaningLanguage;
  if (language && level) {
    return i18n._(
      msg`${plural(count, { one: `# ${language} card`, other: `# ${language} cards` })} at level ${level}, with meanings in ${meaningLanguage}. Try a few, then add the deck to Lymi to review them all.`,
    );
  }
  if (language) {
    return i18n._(
      msg`${plural(count, { one: `# ${language} card`, other: `# ${language} cards` })} with meanings in ${meaningLanguage}. Try a few, then add the deck to Lymi to review them all.`,
    );
  }
  return i18n._(
    msg`${plural(count, { one: "# card", other: "# cards" })} with meanings in ${meaningLanguage}. Try a few, then add the deck to Lymi to review them all.`,
  );
}

export const UNAVAILABLE_TITLE = msg`This deck is no longer published · Lymi`;
export const UNAVAILABLE_BLURB = msg`Its publisher took it off Lymi’s public pages.`;
export const MISSING_TITLE = msg`No deck at this address · Lymi`;
export const MISSING_BLURB = msg`The link may have a typo, or this deck was never published.`;
