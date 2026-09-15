import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { type CSSProperties, useMemo } from "react";
import type { DeckCard } from "../../lib/deck-page";
import { pageI18n } from "../../lib/i18n";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";
import { HandOfCards } from "../landing/HandOfCards";
import type { HandCard } from "../landing/hand-cards";

interface Props {
  locale: string;
  cards: DeckCard[];
  termLanguage: string | null;
  total: number;
  addUrl: string;
}

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

/** Embers off the flame, as at the end of a review: where each drifts to, when it leaves and for how long. */
const EMBERS = [
  { x: -16, y: -118, at: 0, dur: 1500, size: 5 },
  { x: 12, y: -150, at: 90, dur: 1800, size: 4 },
  { x: -4, y: -184, at: 200, dur: 2200, size: 3.5 },
  { x: 24, y: -108, at: 300, dur: 1400, size: 4.5 },
  { x: -26, y: -150, at: 420, dur: 1800, size: 3 },
  { x: 6, y: -132, at: 540, dur: 1600, size: 4 },
  { x: -10, y: -96, at: 680, dur: 1300, size: 3.5 },
  { x: 18, y: -170, at: 800, dur: 2000, size: 3 },
  { x: -18, y: -124, at: 950, dur: 1500, size: 4 },
] as const;
const EMBERS_AT = 460;

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
      <Hand hand={hand} total={total} addUrl={addUrl} />
    </I18nProvider>
  );
}

function Hand({ hand, total, addUrl }: { hand: HandCard[]; total: number; addUrl: string }) {
  const { t } = useLingui();
  return (
    <div className="deck-hand">
      <HandOfCards
        cards={hand}
        dealt={hand}
        finale={(again, turned) => (
          <div className="deck-finale">
            <div className="deck-finale-light">
              <span aria-hidden="true" className="deck-finale-pool">
                <span />
              </span>
              <Lantern glow flicker catchLight className="size-full" />
              <span aria-hidden="true" className="pointer-events-none absolute start-1/2 top-[56%]">
                {EMBERS.map((ember) => (
                  <i
                    key={ember.at}
                    className="deck-finale-ember"
                    style={
                      {
                        width: ember.size,
                        height: ember.size,
                        "--x": `${ember.x}px`,
                        "--y": `${ember.y}px`,
                        "--dur": `${ember.dur}ms`,
                        "--delay": `${EMBERS_AT + ember.at}ms`,
                      } as CSSProperties
                    }
                  />
                ))}
              </span>
            </div>
            <p
              className="deck-finale-rise mt-6 text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl"
              style={delay(640)}
            >
              <Trans>Keep going in Lymi</Trans>
            </p>
            <p
              className="deck-finale-rise mt-3 max-w-[36ch] text-lg text-pretty text-text-2"
              style={delay(800)}
            >
              <Plural
                value={Math.max(total - turned.length, 0)}
                one="One more card is waiting. Add the deck, and Lymi chooses when to bring each one back."
                other="Another # cards are waiting. Add the deck, and Lymi chooses when to bring each one back."
              />
            </p>
            <ul
              aria-label={t`Cards you turned`}
              className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-md font-medium text-text"
            >
              {turned.map((card, index) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: the order they were turned; a term can repeat.
                  key={index}
                  lang={card.language}
                  className="deck-finale-rise"
                  style={delay(960 + index * 70)}
                >
                  {card.term}
                </li>
              ))}
            </ul>
            <div
              className="deck-finale-rise mt-8 flex flex-wrap justify-center gap-2"
              style={delay(1000 + turned.length * 70)}
            >
              <a href={addUrl} className={buttonClass("primary", "lg")}>
                <Trans>Add to Lymi</Trans>
              </a>
              <button type="button" onClick={again} className={buttonClass("ghost", "lg")}>
                <Trans>Try again</Trans>
              </button>
            </div>
          </div>
        )}
      />
    </div>
  );
}
