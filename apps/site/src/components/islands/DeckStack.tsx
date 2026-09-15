import { I18nProvider } from "@lingui/react";
import { Plural, Trans } from "@lingui/react/macro";
import { useMemo } from "react";
import type { DeckCard } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { buttonClass } from "../Button";
import { HandOfCards } from "../landing/HandOfCards";
import type { HandCard } from "../landing/hand-cards";

interface Props {
  locale: string;
  cards: DeckCard[];
  termLanguage: string | null;
  total: number;
  addUrl: string;
}

/** The landing page's hand of cards, dealt once from a few of this deck's cards. Nothing is saved. */
export default function DeckStack({ locale, cards, termLanguage, total, addUrl }: Props) {
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
      <HandOfCards
        cards={hand}
        finale={(again) => (
          <div className="flex h-full flex-col rounded-xl bg-plate p-[calc(var(--cw)*0.08)] text-start edge-2">
            <p className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
              <Plural value={cards.length} one="You turned the card" other="You turned all #" />
            </p>
            <p className="mt-3.5 text-[min(34px,calc(var(--cw)*0.115))] leading-[1.05] font-medium tracking-[-0.03em] text-balance text-text">
              <Trans>Keep going in Lymi</Trans>
            </p>
            <p className="mt-3 text-md text-pretty text-text-2">
              <Plural
                value={total}
                one="Add the deck, and Lymi brings its card back right before you’d forget it."
                other="Add all # cards, and Lymi brings each one back right before you’d forget it."
              />
            </p>
            <div className="mt-auto grid gap-1">
              <a href={addUrl} className={buttonClass("primary", "lg", "w-full")}>
                <Trans>Add to Lymi</Trans>
              </a>
              <button
                type="button"
                onClick={again}
                className={buttonClass("ghost", "lg", "w-full")}
              >
                <Trans>Turn them again</Trans>
              </button>
            </div>
          </div>
        )}
      />
    </I18nProvider>
  );
}
