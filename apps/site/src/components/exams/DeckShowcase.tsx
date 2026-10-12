import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { deckPath } from "../../lib/deck-page";
import type { Locale } from "../../lib/routes";
import { trayHue } from "../../lib/tray";
import { buttonClass } from "../Button";
import { addUrl } from "../deck/DeckView";
import { PreviewFace } from "../deck/PreviewFace";

interface Props {
  deck: PublicDeckSummary;
  locale: Locale;
  /** What the deck is for on this page, above its name. */
  eyebrow?: ReactNode;
  /** Wide sets the tray beside the words; tall stacks them, for a deck in a narrow column. */
  layout?: "wide" | "tall";
}

/** One deck at the size of a decision: its tray and a real card, what it holds, and the add. */
export function DeckShowcase({ deck, locale, eyebrow, layout = "wide" }: Props) {
  const { t } = useLingui();
  const name = deck.name;
  return (
    <article
      className={clsx(
        "deck-showcase grid overflow-hidden rounded-2xl bg-plate edge",
        layout === "wide" && "@2xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]",
      )}
    >
      <div
        aria-hidden="true"
        className="deck-tray deck-showcase-tray"
        data-hue={trayHue(deck.slug)}
      >
        {deck.card && (
          <div className="deck-tray-stack">
            <span className="deck-tray-paper" data-at="2" />
            <span className="deck-tray-paper" data-at="1" />
            <div className="deck-tray-card">
              <PreviewFace
                kind="deck-tray"
                {...deck.card}
                language={deck.language}
                meaningLanguage={deck.meaningLanguage}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col p-6 @2xl:p-8">
        {eyebrow && <p className="text-sm font-medium text-text-2">{eyebrow}</p>}
        <h3
          lang={deck.meaningLanguage}
          className="mt-1.5 text-2xl leading-tight font-medium tracking-[-0.025em] text-balance text-text @2xl:text-3xl"
        >
          {deck.name}
        </h3>
        <p
          lang={deck.meaningLanguage}
          className="mt-2.5 max-w-[46ch] text-md text-pretty text-text-2"
        >
          {deck.summary}
        </p>
        <p className="mt-3 text-sm text-muted tabular-nums">
          <Plural value={deck.cardCount} one="# card" other="# cards" />
          {deck.sectionCount > 0 && (
            <>
              <span aria-hidden="true" className="px-1.5 text-faint">
                ·
              </span>
              <Plural value={deck.sectionCount} one="# section" other="# sections" />
            </>
          )}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-7">
          <a
            href={addUrl(deck.slug, deck.meaningLanguage)}
            aria-label={t`Add ${name} to Lymi`}
            className={buttonClass("secondary", "lg")}
          >
            <Trans>Add to Lymi</Trans>
          </a>
          <a href={deckPath(deck.slug, locale)} className={buttonClass("ghost", "lg")}>
            <Trans>See every card</Trans>
          </a>
        </div>
      </div>
    </article>
  );
}
