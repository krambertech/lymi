import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { deckPath, languageName } from "../../lib/deck-page";
import { type Shelf, searchText, shelvesOf } from "../../lib/explore";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { trayHues } from "../../lib/tray";
import { PreviewFace } from "../deck/PreviewFace";
import { shelfLabel } from "../explore/explore-labels";
import { Lantern } from "../Lantern";

interface Props {
  locale: Locale;
  decks: PublicDeckSummary[];
}

/** How many blank sheets sit behind the card: the deck's own depth, never more than two. */
function paperFor(cardCount: number): number {
  return Math.min(Math.max(cardCount - 1, 0), 2);
}

function DeckTile({ deck, hue, locale }: { deck: PublicDeckSummary; hue: number; locale: Locale }) {
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

function ShelfRow({ shelf, locale }: { shelf: Shelf; locale: Locale }) {
  const { i18n, t } = useLingui();
  const hues = useMemo(() => trayHues(shelf.decks), [shelf.decks]);
  const label = shelfLabel(i18n, shelf.key);
  const headingId = `shelf-${shelf.key}`;
  return (
    <section aria-labelledby={headingId} className="mt-10 first:mt-0">
      <div className="flex items-baseline justify-between gap-5 border-b border-edge pb-3.5">
        <h2 id={headingId} className="text-2xl font-medium tracking-[-0.03em] text-text">
          {label}
        </h2>
        <p className="text-sm whitespace-nowrap text-muted tabular-nums">
          <Plural value={shelf.decks.length} one="# deck" other="# decks" />
        </p>
      </div>
      <ul className="deck-shelf" aria-label={t`${label} decks`}>
        {shelf.decks.map((deck, at) => (
          <li key={deck.slug}>
            <DeckTile deck={deck} hue={hues[at] ?? 0} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The whole catalogue, with a search that narrows what is already on the page. Every deck is in
 * the server-rendered HTML, so the page is complete for a crawler and for a visitor with
 * JavaScript off; searching changes nothing about the address, so it makes no page of its own.
 */
function Catalog({ locale, decks }: Props) {
  const { i18n, t } = useLingui();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const fieldId = useId();
  const field = useRef<HTMLInputElement>(null);

  // The whole catalogue is on the page before this hydrates, so someone can type into the field
  // before React owns it. Take whatever is already there rather than clearing their search.
  useEffect(() => {
    const typed = field.current?.value;
    if (typed) setQuery(typed);
  }, []);

  const all = useMemo(() => shelvesOf(decks), [decks]);
  const haystacks = useMemo(
    () =>
      new Map(
        decks.map((deck) => [
          deck.slug,
          searchText(
            deck,
            [deck.language, deck.meaningLanguage].flatMap((tag) => {
              const name = languageName(tag, i18n.locale);
              const english = languageName(tag, "en");
              return name ? (english && english !== name ? [name, english] : [name]) : [];
            }),
            i18n.locale,
          ),
        ]),
      ),
    [decks, i18n.locale],
  );

  const terms = query.trim().toLocaleLowerCase(i18n.locale);
  const shelves = useMemo(() => {
    const wanted = all.filter((shelf) => category === null || shelf.key === category);
    if (!terms) return wanted;
    return wanted
      .map((shelf) => ({
        key: shelf.key,
        decks: shelf.decks.filter((deck) => haystacks.get(deck.slug)?.includes(terms)),
      }))
      .filter((shelf) => shelf.decks.length > 0);
  }, [all, category, haystacks, terms]);

  const found = shelves.reduce((sum, shelf) => sum + shelf.decks.length, 0);

  return (
    <>
      <div className="mx-auto mt-8 grid w-full max-w-[520px] gap-4">
        <div className="relative flex items-center">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-4 size-[18px] text-faint"
          />
          <input
            ref={field}
            id={fieldId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t`Search decks`}
            aria-label={t`Search decks`}
            className="h-12 w-full rounded-md border border-edge bg-plate ps-12 pe-4 text-md text-text transition-colors duration-150 placeholder:text-muted focus:outline-2 focus:-outline-offset-1 focus:outline-ring"
          />
        </div>
        {all.length > 1 && (
          <fieldset className="flex flex-wrap justify-center gap-1.5" aria-label={t`Shelf`}>
            <button
              type="button"
              aria-pressed={category === null}
              onClick={() => setCategory(null)}
              className={chipClass(category === null)}
            >
              <Trans>All</Trans>
              <span className={countClass(category === null)}>{decks.length}</span>
            </button>
            {all.map((shelf) => {
              const chosen = category === shelf.key;
              return (
                <button
                  key={shelf.key}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => setCategory(chosen ? null : shelf.key)}
                  className={chipClass(chosen)}
                >
                  {shelfLabel(i18n, shelf.key)}
                  <span className={countClass(chosen)}>{shelf.decks.length}</span>
                </button>
              );
            })}
          </fieldset>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        <Plural value={found} one="# deck" other="# decks" />
      </p>

      <div className="mt-12">
        {shelves.length > 0 ? (
          shelves.map((shelf) => <ShelfRow key={shelf.key} shelf={shelf} locale={locale} />)
        ) : (
          <div className="mx-auto grid max-w-[44ch] justify-items-center py-16 text-center">
            {/* The lantern with its flame out: the search looked here and found nothing. */}
            <Lantern variant="unlit" className="size-16" />
            <p className="mt-6 text-xl font-medium tracking-[-0.02em] text-balance text-text">
              <Trans>Nothing here by that name.</Trans>
            </p>
            <p className="mt-3 text-md text-pretty text-text-2">
              <Trans>
                Try a word you would find on a card, or the language you are learning. Lymi
                publishes a deck as soon as it is written and checked.
              </Trans>
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="mt-6 rounded-sm px-3 py-2 text-md font-medium text-text underline decoration-edge-2 underline-offset-4 transition-colors duration-150 hoverable:hover:decoration-text"
            >
              <Trans>Show every deck</Trans>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const chipClass = (chosen: boolean) =>
  clsx(
    "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
    chosen ? "bg-text text-canvas" : "bg-plate-2 text-text-2 hoverable:hover:bg-hover",
  );

const countClass = (chosen: boolean) =>
  clsx("tabular-nums", chosen ? "text-canvas/60" : "text-faint");

export default function ExploreCatalog({ locale, decks }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Catalog locale={locale} decks={decks} />
    </I18nProvider>
  );
}
