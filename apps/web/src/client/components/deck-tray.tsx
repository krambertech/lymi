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

/** Step from the middle, drop and tilt for a hand of one, two or three cards; the first lies on top. */
export const HAND_FANS: [number, number, number][][] = [
  [[0, 0, -2]],
  [
    [0.4, 0, 3],
    [-0.4, 14, -4],
  ],
  [
    [0, 0, 1],
    [-1, 18, -7],
    [1, 22, 6],
  ],
];

/** A long compound would break mid-letter at the full size, so the term steps down first. */
function termStep(term: string): number {
  const longest = Math.max(...term.split(/\s+/).map((word) => word.length));
  return longest >= 13 ? 0.105 : longest >= 10 ? 0.12 : 0.14;
}

/** A card's section, term and meaning as a tray draws them, sized by the `--cw` around it. */
export function TrayCardFace({
  card,
  language,
  meaningLanguage,
}: {
  card: NonNullable<PublicDeckSummary["card"]>;
  language: string | null;
  meaningLanguage: string;
}) {
  return (
    <>
      {card.section && (
        <p lang={meaningLanguage} className="deck-tray-section">
          {card.section}
        </p>
      )}
      <p
        lang={language ?? undefined}
        className="deck-tray-term"
        style={{ "--t": termStep(card.term) } as CSSProperties}
      >
        {card.term}
      </p>
      <p lang={meaningLanguage} className="deck-tray-meaning">
        {card.meaning}
      </p>
    </>
  );
}

interface TrayProps {
  slug: string;
  cardCount: number;
  card: PublicDeckSummary["card"];
  language: string | null;
  meaningLanguage: string;
  className?: string | undefined;
}

/**
 * One of the deck's own cards sitting in a tray: the cut reads as tucked into a shelf, and the
 * hue is a pure function of the slug, so this deck arrives at the same colour on `lymi.app`,
 * on its own page here, and anywhere else it is offered. docs/design/system/surfaces.md, "The tray".
 */
export function DeckTray({
  slug,
  cardCount,
  card,
  language,
  meaningLanguage,
  className,
}: TrayProps) {
  const hue = trayHue(slug);
  if (!card) {
    return <div className={clsx("deck-tray", className)} data-hue={hue} aria-hidden="true" />;
  }
  return (
    <div className={clsx("deck-tray", className)} data-hue={hue}>
      <div className="deck-tray-stack">
        {Array.from({ length: paperFor(cardCount) }, (_, at) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack, and the sheets are blank.
          <span key={at} className="deck-tray-paper" data-at={at + 1} aria-hidden="true" />
        ))}
        <article className="deck-tray-card">
          <TrayCardFace card={card} language={language} meaningLanguage={meaningLanguage} />
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
 * here rather than amber — a shelf of decks has no single thing to press. docs/design/system/colour.md.
 */
export function DeckTile({ deck, addedTo, onAdd, adding, st }: TileProps) {
  const { t } = useLingui();
  return (
    // A card, not a group on the open canvas as on the public page: the press has to belong to
    // something, and an Add button floating under a name reads as loose. The tray runs to the
    // card's own edges and the card clips it, so the two corners are concentric by construction
    // rather than by a radius that has to be kept in step with the padding.
    <div className="deck-tile edge grid h-full grid-rows-[1fr_auto] overflow-hidden rounded-xl bg-plate">
      <Link
        to="/explore/$slug"
        params={{ slug: deck.slug }}
        disabled={!!st}
        className="grid content-start gap-3.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <DeckTray
          slug={deck.slug}
          cardCount={deck.cardCount}
          card={deck.card}
          language={deck.language}
          meaningLanguage={deck.meaningLanguage}
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
            className="relative inline-flex h-8 items-center gap-1.5 rounded-sm px-2 -ms-2 text-sm font-medium text-text-2 transition-colors duration-150 before:absolute before:-inset-1.5 before:content-[''] hoverable:hover:bg-hover hoverable:hover:text-text [&_svg]:size-4"
          >
            <Check aria-hidden="true" className="text-state-known" />
            <Trans>In Library</Trans>
          </Link>
        ) : (
          <Button
            size="sm"
            onClick={onAdd}
            loading={adding}
            aria-label={t`Add “${deck.name}” to Library`}
          >
            <Plus aria-hidden="true" />
            <Trans>Add</Trans>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Cards and sections, in that order, on one line. */
export function DeckMeta({
  deck,
  size = "xs",
  className,
}: {
  deck: Pick<PublicDeckSummary, "cardCount" | "sectionCount">;
  /** "sm" is the deck's own page, where the line sits beside the byline in its tone. */
  size?: "xs" | "sm" | undefined;
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
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 tabular-nums",
        size === "sm" ? "text-sm text-text-2" : "text-xs text-muted",
        className,
      )}
    >
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
