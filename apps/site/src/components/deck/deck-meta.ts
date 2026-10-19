import type { I18n } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { type PublicDeckOut, taughtLanguage } from "@lymi/core/catalog";
import { languageName } from "../../lib/deck-page";
import {
  branded,
  cutAtWord,
  DESCRIPTION_MAX,
  firstSentence,
  firstThatFits,
  namesLanguage,
  quotable,
  TITLE_MAX,
} from "../../lib/seo-text";
import { deckSubject } from "../../lib/subjects";

/** Whether two language tags name the same language, whatever their region. */
function sameLanguage(one: string | null, other: string | null): boolean {
  return Boolean(one && other && one.split("-")[0] === other.split("-")[0]);
}

/** The meaning language a page's own words are written in, so a summary is quoted only in it. */
function samePageLanguage(deck: PublicDeckOut, locale: string): boolean {
  return sameLanguage(deck.meaningLanguage, locale);
}

/**
 * The deck's title for the tab and search results. It leads with the deck's name, which says
 * the language and level or topic people search for, then how many free cards it has.
 */
export function deckTitle(i18n: I18n, deck: PublicDeckOut): string {
  const name = deck.name;
  const count = deck.cardCount;
  const taught = taughtLanguage(deck);
  const language = languageName(taught, i18n.locale, { label: true });
  // The name may stay in the deck's own language on another locale's page, so check it in both.
  const ownName = languageName(taught, deck.meaningLanguage);
  const named =
    !language ||
    namesLanguage(name, language, i18n.locale) ||
    (ownName !== null && namesLanguage(name, ownName, deck.meaningLanguage));
  const counted = i18n._(
    msg`${name} · ${plural(count, { one: "# free flashcard", other: "# free flashcards" })}`,
  );
  const facts = !named
    ? i18n._(
        msg`${language} · ${name} · ${plural(count, { one: "# free flashcard", other: "# free flashcards" })}`,
      )
    : counted;
  // When the language makes it too long, the count is worth more than the brand.
  return firstThatFits(
    [branded(i18n, facts), facts, branded(i18n, counted), counted, branded(i18n, name), name],
    TITLE_MAX,
  );
}

/**
 * A few of the deck's first cards, one from each early section, as "term (meaning)", or the term
 * alone when the meanings are in another language than the page.
 */
function examples(deck: PublicDeckOut, size: number, withMeaning: boolean): string[] {
  const picks: string[] = [];
  const firsts = deck.sections.map((section) => section.cards);
  for (let round = 0; picks.length < size && round < 3; round++) {
    for (const cards of firsts) {
      const card = cards[round];
      const term = quotable(card?.term);
      const meaning = quotable(card?.meaning);
      if (term && !withMeaning) picks.push(term);
      else if (term && meaning) picks.push(`${term} (${meaning})`);
      if (picks.length >= size) break;
    }
  }
  return picks;
}

/** The names of the deck's first sections, without the asides in brackets. */
function sectionNames(deck: PublicDeckOut, size: number): string[] {
  return deck.sections
    .flatMap((section) => (section.name ? [quotable(section.name, 40)] : []))
    .filter((name): name is string => Boolean(name))
    .slice(0, size);
}

/**
 * Written from the deck's facts in the page language: what it teaches, how many free cards, and a
 * few real cards or section names, so the line matches what people type. Fitted to one result.
 */
export function deckDescription(i18n: I18n, deck: PublicDeckOut): string {
  const count = deck.cardCount;
  const taught = taughtLanguage(deck);
  const language = languageName(taught, i18n.locale, { label: true });
  const meaningLanguage = languageName(deck.meaningLanguage, i18n.locale) ?? deck.meaningLanguage;
  const same = samePageLanguage(deck, i18n.locale);
  const summary = same ? deck.summary.trim() : "";
  const sentence = (text: string) => (text && !/[.!?…]$/.test(text) ? `${text}.` : text);
  const join = (...parts: string[]) => parts.filter(Boolean).join(" ");
  // Each lead is the summary as a sentence: whole, then its first sentence alone.
  const leads = [...new Set([summary, firstSentence(summary)].map(sentence))].filter(Boolean);
  const forExample = (items: string[]) => {
    const list = items.join(", ");
    return list ? i18n._(msg`For example: ${list}.`) : "";
  };
  // Section names can hold commas of their own, so a semicolon keeps them apart.
  const inSections = (items: string[]) => {
    const list = items.join("; ");
    return list ? i18n._(msg`Sections: ${list}.`) : "";
  };

  if (language) {
    const facts = sameLanguage(taught, deck.meaningLanguage)
      ? i18n._(
          msg`${plural(count, { one: `# free ${language} flashcard`, other: `# free ${language} flashcards` })}.`,
        )
      : i18n._(
          msg`${plural(count, { one: `# free ${language} flashcard`, other: `# free ${language} flashcards` })} with meanings in ${meaningLanguage}.`,
        );
    const shown = [3, 2, 1].map((size) => forExample(examples(deck, size, same)));
    return firstThatFits(
      [
        ...leads.flatMap((lead) => shown.map((line) => join(facts, line, lead))),
        ...shown.map((line) => join(facts, line)),
        ...leads.map((lead) => join(facts, lead)),
        facts,
      ],
      DESCRIPTION_MAX,
    );
  }
  const facts = i18n._(
    msg`${plural(count, { one: "# free flashcard", other: "# free flashcards" })}.`,
  );
  // A subject deck's sections and terms are in its meaning language, so another page quotes neither.
  const names = same ? sectionNames(deck, 3) : [];
  const more = !same
    ? []
    : names.length > 1
      ? [3, 2].map((size) => inSections(names.slice(0, size)))
      : [2, 1].map((size) => forExample(examples(deck, size, true)));
  // Past every whole sentence, the summary cut to fit beside the count still beats the count alone.
  const room = DESCRIPTION_MAX - [...facts].length - 1;
  const cut = summary && room >= 40 ? cutAtWord(summary, room) : "";
  return firstThatFits(
    [
      ...leads.flatMap((lead) => more.map((line) => join(lead, facts, line))),
      ...leads.map((lead) => join(lead, facts)),
      join(cut, facts),
      ...more.map((line) => join(facts, line)),
      facts,
    ],
    DESCRIPTION_MAX,
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
