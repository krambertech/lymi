import { msg, plural } from "@lingui/core/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import type { Exam } from "../../lib/exams";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { branded, DESCRIPTION_MAX, firstThatFits, TITLE_MAX } from "../../lib/seo-text";

type Listed = Pick<PublicDeckSummary, "cardCount">;

/** The exam page's title: its heading where that fits, else the exam's name and its free cards. */
export function examTitle(exam: Exam, locale: Locale, decks: readonly Listed[] = []): string {
  const i18n = pageI18n(locale);
  const heading = i18n._(exam.heading);
  const name = i18n._(exam.name);
  const count = decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  const facts =
    count > 0
      ? i18n._(
          msg`${name} · ${plural(count, { one: "# free flashcard", other: "# free flashcards" })}`,
        )
      : name;
  return firstThatFits(
    [branded(i18n, heading), heading, branded(i18n, facts), facts, name],
    TITLE_MAX,
  );
}

/** The exam's lede, then how many free cards its decks hold, where the line has room. */
export function examDescription(exam: Exam, locale: Locale, decks: readonly Listed[] = []): string {
  const i18n = pageI18n(locale);
  const lede = i18n._(exam.lede);
  const count = decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  if (count === 0) return firstThatFits([lede], DESCRIPTION_MAX);
  const deckCount = decks.length;
  const holds = i18n._(
    msg`${plural(count, { one: "# free flashcard", other: "# free flashcards" })} in ${plural(deckCount, { one: "# deck", other: "# decks" })}.`,
  );
  return firstThatFits([`${lede} ${holds}`, lede], DESCRIPTION_MAX);
}
