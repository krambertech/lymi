import { I18nProvider } from "@lingui/react";
import { useMemo } from "react";
import type { DeckCard } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { HandOfCards } from "../landing/HandOfCards";
import type { HandCard } from "../landing/hand-cards";

interface Props {
  locale: string;
  cards: DeckCard[];
  termLanguage: string | null;
}

/** The site's stack of cards to turn over, dealt from a few of this deck's cards. Nothing is saved. */
export default function DeckStack({ locale, cards, termLanguage }: Props) {
  const hand = useMemo<HandCard[]>(
    () =>
      cards.map((card, index) => ({
        id: `deck-${index}`,
        source: card.section ?? "",
        language: termLanguage ?? undefined,
        term: card.term,
        meaning: card.meaning,
        audio: null,
      })),
    [cards, termLanguage],
  );
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <HandOfCards cards={hand} layout="stack" />
    </I18nProvider>
  );
}
