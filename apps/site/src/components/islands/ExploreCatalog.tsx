import { I18nProvider } from "@lingui/react";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { type PublicDeckSummary, subjectOf, taughtLanguage } from "@lymi/core/catalog";
import { ChevronRight, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { languageName } from "../../lib/deck-page";
import {
  hasShelfPage,
  type Shelf,
  searchText,
  shelfPath,
  shelfRoute,
  shelvesOf,
} from "../../lib/explore";
import { pageI18n } from "../../lib/i18n";
import type { Locale } from "../../lib/routes";
import { subjectLabel } from "../../lib/subjects";
import { trayHues } from "../../lib/tray";
import { DeckTile } from "../explore/DeckTile";
import { shelfLabel, tagLabel } from "../explore/explore-labels";
import { ShelfBar, shelfId } from "../explore/ShelfBar";
import { Lantern } from "../Lantern";

interface Props {
  locale: Locale;
  decks: PublicDeckSummary[];
}

/**
 * One shelf. Where the shelf has a page of its own, it shows one row of decks and leads to the
 * rest; a search shows every match, and a shelf with no page shows every deck, since nothing else
 * would lead to them.
 */
function ShelfRow({ shelf, locale, trimmed }: { shelf: Shelf; locale: Locale; trimmed: boolean }) {
  const { i18n, t } = useLingui();
  const hues = useMemo(() => trayHues(shelf.decks), [shelf.decks]);
  const label = shelfLabel(i18n, shelf);
  const headingId = shelfId(shelf.key);
  const route = shelfRoute(shelf);
  const page = route && hasShelfPage(shelf) ? shelfPath(route, locale) : null;
  return (
    <section aria-labelledby={headingId} className="mt-10 first:mt-0">
      <div className="flex items-baseline justify-between gap-5 border-b border-edge pb-3.5">
        <h2
          id={headingId}
          tabIndex={-1}
          className="scroll-mt-24 text-2xl font-medium tracking-[-0.03em] text-text focus:outline-none"
        >
          {label}
        </h2>
        {page ? (
          <a
            href={page}
            className="inline-flex shrink-0 items-center gap-1 rounded-xs text-sm font-medium whitespace-nowrap text-text-2 transition-colors duration-150 hoverable:hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Trans>See all</Trans>
            <span className="font-normal text-muted tabular-nums">{shelf.decks.length}</span>
            <ChevronRight aria-hidden="true" className="size-4 text-muted rtl:-scale-x-100" />
          </a>
        ) : (
          <p className="text-sm whitespace-nowrap text-muted tabular-nums">
            <Plural value={shelf.decks.length} one="# deck" other="# decks" />
          </p>
        )}
      </div>
      <ul
        className="deck-shelf"
        data-row={(trimmed && page !== null) || undefined}
        aria-label={t`${label} decks`}
      >
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
 * The whole catalogue, with a search that narrows what is already on the page and a chip per shelf
 * that jumps to it. Every deck is in the server-rendered HTML, so the page is complete for a crawler
 * and for a visitor with JavaScript off, where a chip is a plain link to its shelf. Neither changes
 * the address once the page hydrates, so neither makes a page of its own.
 */
function Catalog({ locale, decks }: Props) {
  const { i18n, t } = useLingui();
  const [query, setQuery] = useState("");
  const fieldId = useId();
  const field = useRef<HTMLInputElement>(null);

  // The whole catalogue is on the page before this hydrates, so someone can type into the field
  // before React owns it. Take whatever is already there rather than clearing their search.
  useEffect(() => {
    const typed = field.current?.value;
    if (typed) setQuery(typed);
  }, []);

  const all = useMemo(() => shelvesOf(decks), [decks]);
  const haystacks = useMemo(() => {
    const english = pageI18n("en");
    return new Map(
      decks.map((deck) => [
        deck.slug,
        searchText(
          deck,
          [
            ...[taughtLanguage(deck), deck.meaningLanguage].flatMap((tag) => {
              const name = languageName(tag, i18n.locale);
              const inEnglish = languageName(tag, "en");
              return name ? (inEnglish && inEnglish !== name ? [name, inEnglish] : [name]) : [];
            }),
            ...[subjectLabel(i18n, subjectOf(deck))].filter((name) => name !== null),
            ...deck.tags.flatMap((tag) => [tagLabel(i18n, tag), tagLabel(english, tag)]),
          ],
          i18n.locale,
        ),
      ]),
    );
  }, [decks, i18n]);

  const terms = query.trim().toLocaleLowerCase(i18n.locale);
  const shelves = useMemo(() => {
    if (!terms) return all;
    return all
      .map((shelf) => ({
        ...shelf,
        decks: shelf.decks.filter((deck) => haystacks.get(deck.slug)?.includes(terms)),
      }))
      .filter((shelf) => shelf.decks.length > 0);
  }, [all, haystacks, terms]);

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
      </div>
      {shelves.length > 1 && <ShelfBar shelves={shelves} />}

      <p role="status" aria-live="polite" className="sr-only">
        <Plural value={found} one="# deck" other="# decks" />
      </p>

      <div className="mt-12">
        {shelves.length > 0 ? (
          shelves.map((shelf) => (
            <ShelfRow key={shelf.key} shelf={shelf} locale={locale} trimmed={!terms} />
          ))
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
              onClick={() => setQuery("")}
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

export default function ExploreCatalog({ locale, decks }: Props) {
  return (
    <I18nProvider i18n={pageI18n(locale)}>
      <Catalog locale={locale} decks={decks} />
    </I18nProvider>
  );
}
