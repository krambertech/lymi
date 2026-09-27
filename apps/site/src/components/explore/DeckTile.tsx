import { Plural, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { deckPath } from "../../lib/deck-page";
import type { Locale } from "../../lib/routes";
import { PreviewFace } from "../deck/PreviewFace";

/** How many blank sheets sit behind the card: the deck's own depth, never more than two. */
function paperFor(cardCount: number): number {
  return Math.min(Math.max(cardCount - 1, 0), 2);
}

export function DeckTile({
  deck,
  hue,
  locale,
}: {
  deck: PublicDeckSummary;
  hue: number;
  locale: Locale;
}) {
  const { t } = useLingui();
  return (
    <a
      href={deckPath(deck.slug, locale)}
      className="deck-tile group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      {deck.card ? (
        <div className="deck-tray" data-hue={hue}>
          <div className="deck-tray-stack">
            {/* Paper behind the card, one sheet per further card the deck holds, at most two. */}
            {Array.from({ length: paperFor(deck.cardCount) }, (_, at) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack, and the sheets are blank.
              <span key={at} className="deck-tray-paper" data-at={at + 1} aria-hidden="true" />
            ))}
            <article className="deck-tray-card">
              <PreviewFace
                kind="deck-tray"
                {...deck.card}
                language={deck.language}
                meaningLanguage={deck.meaningLanguage}
              />
            </article>
          </div>
        </div>
      ) : (
        <div className="deck-tray" data-hue={hue} aria-hidden="true" />
      )}
      <h3
        lang={deck.meaningLanguage}
        className="mt-3.5 text-lg leading-tight font-medium tracking-[-0.025em] text-balance text-text"
      >
        {deck.name}
      </h3>
      <p lang={deck.meaningLanguage} className="mt-1 line-clamp-2 text-sm text-text-2">
        {deck.summary}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted tabular-nums">
        {deck.level && (
          <>
            <span>{deck.level}</span>
            <span aria-hidden="true" className="text-faint">
              ·
            </span>
          </>
        )}
        <span>
          <Plural value={deck.cardCount} one="# card" other="# cards" />
        </span>
        {deck.sectionCount > 0 && (
          <>
            <span aria-hidden="true" className="text-faint">
              ·
            </span>
            <span>
              <Plural value={deck.sectionCount} one="# section" other="# sections" />
            </span>
          </>
        )}
      </p>
      <span className="sr-only">{t`Open the deck`}</span>
    </a>
  );
}
