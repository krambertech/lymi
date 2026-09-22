import { Trans } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { trayHue } from "@lymi/core/catalog";
import { ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { buttonClass } from "./button";
import { HAND_FANS, TrayCardFace } from "./deck-tray";
import type { StaticNav } from "./nav-link";
import { NavLink } from "./nav-link";

interface Props {
  /** Published decks the learner has not added, in the catalogue's own order. */
  decks: PublicDeckSummary[];
  st?: StaticNav;
}

/**
 * The way to a ready-made deck under Today's getting started guide: one banner on the first
 * offered deck's tray colour, holding a card from each of up to three decks, that leads to
 * Explore. Choosing happens there, where the decks sit on their shelves. Its button is white on
 * the colour rather than amber, so the guide's own step stays the one thing to press.
 */
export function ReadyDecks({ decks, st }: Props) {
  const hand = decks.flatMap((deck) => (deck.card ? [{ deck, card: deck.card }] : [])).slice(0, 3);
  const fan = HAND_FANS[hand.length - 1] ?? [];
  return (
    <section
      aria-labelledby="today-ready"
      className="deck-banner @container grid overflow-hidden rounded-xl @2xl:grid-cols-[auto_minmax(0,1fr)] @2xl:items-center"
      data-hue={trayHue(decks[0]?.slug ?? "")}
    >
      {hand.length > 0 && (
        // The cards are a picture of what Explore holds; the heading and the button carry the words.
        <div className="deck-hand mt-6 @2xl:my-6 @2xl:ms-6" aria-hidden="true">
          {hand.map(({ deck, card }, at) => {
            const [step, drop, tilt] = fan[at] ?? [0, 0, 0];
            const style = {
              "--step": step,
              "--drop": `${drop}px`,
              "--tilt": `${tilt}deg`,
              zIndex: hand.length - at,
            } as CSSProperties;
            return (
              <div key={deck.slug} className="deck-hand-card" style={style}>
                <TrayCardFace
                  card={card}
                  language={deck.language}
                  meaningLanguage={deck.meaningLanguage}
                />
              </div>
            );
          })}
        </div>
      )}
      <div className="grid justify-items-start gap-2 p-5 @2xl:py-8 @2xl:pe-8 @2xl:ps-4">
        <h2 id="today-ready" className="text-xl font-medium leading-tight text-balance text-text">
          <Trans>Start with a ready-made deck</Trans>
        </h2>
        <p className="max-w-[44ch] text-base text-text-2 text-pretty">
          <Trans>Decks from Lymi. Add one to study it in your language.</Trans>
        </p>
        <NavLink
          to="/explore"
          st={st}
          className={buttonClass("secondary", "md", "deck-cover-action mt-3 w-full @2xl:w-auto")}
        >
          <Trans>Browse ready-made decks</Trans>
          <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />
        </NavLink>
      </div>
    </section>
  );
}
