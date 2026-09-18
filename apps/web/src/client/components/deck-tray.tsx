import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { trayHue } from "@lymi/core/catalog";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { Check, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "./button";
import type { StaticNav } from "./nav-link";

/** How many blank sheets sit behind the card: the deck's own depth, never more than two. */
function paperFor(cardCount: number): number {
  return Math.min(Math.max(cardCount - 1, 0), 2);
}

/** A long compound would break mid-letter at the full size, so the term steps down first. */
function termStep(term: string): number {
  const longest = Math.max(...term.split(/\s+/).map((word) => word.length));
  return longest >= 13 ? 0.105 : longest >= 10 ? 0.12 : 0.14;
}

interface TrayProps {
  slug: string;
  cardCount: number;
  card: PublicDeckSummary["card"];
  language: string | null;
  meaningLanguage: string;
  /** "lg" is the deck's own page, where one tray stands alone rather than in a row. */
  size?: "lg" | undefined;
  className?: string | undefined;
}

/**
 * One of the deck's own cards sitting in a tray: the cut reads as tucked into a shelf, and the
 * hue is a pure function of the slug, so this deck arrives at the same colour on `lymi.app`,
 * on its own page here, and anywhere else it is offered. DESIGN.md, "The tray".
 */
export function DeckTray({
  slug,
  cardCount,
  card,
  language,
  meaningLanguage,
  size,
  className,
}: TrayProps) {
  const hue = trayHue(slug);
  if (!card) {
    return (
      <div
        className={clsx("deck-tray", className)}
        data-hue={hue}
        data-size={size}
        aria-hidden="true"
      />
    );
  }
  return (
    <div className={clsx("deck-tray", className)} data-hue={hue} data-size={size}>
      <div className="deck-tray-stack">
        {Array.from({ length: paperFor(cardCount) }, (_, at) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack, and the sheets are blank.
          <span key={at} className="deck-tray-paper" data-at={at + 1} aria-hidden="true" />
        ))}
        <article className="deck-tray-card" style={{ "--t": termStep(card.term) } as CSSProperties}>
          {card.section && (
            <p lang={meaningLanguage} className="deck-tray-section">
              {card.section}
            </p>
          )}
          <p lang={language ?? undefined} className="deck-tray-term">
            {card.term}
          </p>
          <p lang={meaningLanguage} className="deck-tray-meaning">
            {card.meaning}
          </p>
        </article>
      </div>
    </div>
  );
}

interface TileProps {
  deck: PublicDeckSummary;
  /** The deck in Library once the learner has it; the tile then leads there instead of adding. */
  addedTo: string | null;
  onAdd: () => void;
  adding?: boolean | undefined;
  st?: StaticNav;
}

/**
 * A deck on a shelf: its card in a tray, its name, and the one press that adds it. The name is
 * the largest thing in the group and the card's term sets smaller than it. Add is secondary
 * here rather than amber — a shelf of decks has no single thing to press, and the deck's own
 * page is where the amber button lives. DESIGN.md, "Colour".
 */
export function DeckTile({ deck, addedTo, onAdd, adding, st }: TileProps) {
  const { t } = useLingui();
  return (
    // A card, not a group on the open canvas as on the public page: the press has to belong to
    // something, and an Add button floating under a name reads as loose. The tray runs to the
    // card's own edges and the card clips it, so the two corners are concentric by construction
    // rather than by a radius that has to be kept in step with the padding.
    <div className="deck-tile edge grid h-full content-start overflow-hidden rounded-xl bg-plate">
      <Link
        to="/explore/$slug"
        params={{ slug: deck.slug }}
        disabled={!!st}
        className="grid gap-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <DeckTray
          slug={deck.slug}
          cardCount={deck.cardCount}
          card={deck.card}
          language={deck.language}
          meaningLanguage={deck.meaningLanguage}
          className="rounded-none"
        />
        <div className="grid gap-1 px-3.5">
          <h3
            lang={deck.meaningLanguage}
            className="text-lg font-medium leading-tight tracking-[-0.025em] text-balance text-text"
          >
            {deck.name}
          </h3>
          <p lang={deck.meaningLanguage} className="line-clamp-2 text-sm text-text-2">
            {deck.summary}
          </p>
          <DeckMeta deck={deck} />
        </div>
      </Link>
      <div className="px-3.5 pb-3.5 pt-3.5">
        {addedTo ? (
          <Link
            to="/library/$deckId"
            params={{ deckId: addedTo }}
            disabled={!!st}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 -ms-2 text-sm font-medium text-text-2 transition-colors duration-150 hoverable:hover:bg-hover hoverable:hover:text-text [&_svg]:size-4"
          >
            <Check aria-hidden="true" className="text-state-known" />
            <Trans>In your library</Trans>
          </Link>
        ) : (
          <Button
            size="sm"
            onClick={onAdd}
            loading={adding}
            aria-label={t`Add “${deck.name}” to your library`}
          >
            <Plus aria-hidden="true" />
            <Trans>Add</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Level, cards and sections, in that order, on one line. */
export function DeckMeta({
  deck,
  className,
}: {
  deck: Pick<PublicDeckSummary, "level" | "cardCount" | "sectionCount">;
  className?: string | undefined;
}) {
  const dot = (
    <span aria-hidden="true" className="text-faint">
      ·
    </span>
  );
  return (
    <p
      className={clsx(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted tabular-nums",
        className,
      )}
    >
      {deck.level && (
        <>
          <span>{deck.level}</span>
          {dot}
        </>
      )}
      <span>
        <Plural value={deck.cardCount} one="# card" other="# cards" />
      </span>
      {deck.sectionCount > 0 && (
        <>
          {dot}
          <span>
            <Plural value={deck.sectionCount} one="# section" other="# sections" />
          </span>
        </>
      )}
    </p>
  );
}
