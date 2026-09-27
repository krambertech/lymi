import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreOut, Shelf } from "@lymi/core/catalog";
import { shelvesOf } from "@lymi/core/catalog";
import { Compass } from "lucide-react";
import { type MouseEvent, useMemo } from "react";
import { DeckTile } from "../components/deck-tray";
import { EmptySection, ErrorState } from "../components/empty-state";
import { Screen } from "../components/layout/screen";
import { Skeleton } from "../components/skeleton";
import { shelfLabel } from "../lib/explore";

interface Props {
  data: ExploreOut | undefined;
  failed?: boolean | undefined;
  busy?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  onAdd: (deck: { slug: string; name: string; edition: string }) => void;
  /** The slug currently being added, so only its own tile waits. */
  adding?: string | undefined;
}

const shelfId = (key: string) => `shelf-${key}`;

/**
 * A chip per shelf, in shelf order: the way to move through many shelves. It scrolls to the shelf
 * and moves focus to its heading, and leaves the address alone, as on the public page.
 */
function ShelfChips({ shelves }: { shelves: readonly Shelf[] }) {
  const { i18n, t } = useLingui();
  const jump = (event: MouseEvent<HTMLAnchorElement>, key: string) => {
    const heading = document.getElementById(shelfId(key));
    if (!heading) return;
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    heading.focus({ preventScroll: true });
  };
  return (
    // One row that scrolls on a phone, where two dozen wrapped chips would bury the shelves.
    <nav
      aria-label={t`Shelves`}
      className="-mx-5 mb-8 overflow-x-auto px-5 [scrollbar-width:none] @3xl/shell:mx-0 @3xl/shell:overflow-visible @3xl/shell:px-0"
    >
      <ul className="flex w-max gap-2 @3xl/shell:w-auto @3xl/shell:flex-wrap">
        {shelves.map((shelf) => (
          <li key={shelf.key}>
            <a
              href={`#${shelfId(shelf.key)}`}
              onClick={(event) => jump(event, shelf.key)}
              className="inline-flex h-9 items-center gap-2 rounded-full whitespace-nowrap bg-plate-2 px-3.5 text-base font-medium text-text transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-hover pointer-coarse:h-11 pointer-coarse:px-4"
            >
              {shelfLabel(i18n, shelf)}
              <span className="text-sm text-muted tabular-nums">{shelf.decks.length}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Explore in the app: every deck Lymi publishes, a shelf per language and then per subject, each
 * wrapping into as many rows as its decks need, with a chip per shelf above them. It reads the same projection as `lymi.app/explore`, so the two can never
 * disagree. ADR 0016, `docs/design/explore.md`.
 */
export function ExploreView({ data, failed, busy, onRetry, onAdd, adding }: Props) {
  const { i18n, t } = useLingui();
  const shelves = useMemo(() => shelvesOf(data?.decks ?? []), [data?.decks]);

  return (
    // No count here: each shelf below counts its own, as it does on the public page.
    <Screen
      kind="tab"
      title={<Trans>Explore</Trans>}
      lede={
        <p className="mt-2 max-w-[52ch] text-base text-text-2">
          <Trans>Ready-made decks from Lymi. Add one to study it in your language.</Trans>
        </p>
      }
    >
      {failed ? (
        <ErrorState
          title={<Trans>Couldn’t load Explore</Trans>}
          onRetry={onRetry}
          retrying={busy}
        />
      ) : !data ? (
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className="h-8 w-44 rounded-sm" />
          <div className="deck-shelf">
            {[0, 1, 2].map((at) => (
              <div key={at} className="grid gap-3.5">
                <Skeleton className="h-[127px] w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4 rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
              </div>
            ))}
          </div>
        </div>
      ) : shelves.length === 0 ? (
        <EmptySection
          icon={<Compass />}
          title={<Trans>Nothing published yet</Trans>}
          body={
            <Trans>Lymi is writing the first decks. Until then, make your own in Library.</Trans>
          }
        />
      ) : (
        <>
          {shelves.length > 1 && <ShelfChips shelves={shelves} />}
          {shelves.map((shelf) => {
            const label = shelfLabel(i18n, shelf);
            const headingId = shelfId(shelf.key);
            return (
              <section key={shelf.key} aria-labelledby={headingId} className="mt-8 first:mt-0">
                <div className="flex items-baseline justify-between gap-5 border-b border-edge pb-3">
                  <h2
                    id={headingId}
                    tabIndex={-1}
                    className="scroll-mt-6 text-lg font-medium text-text focus:outline-none"
                  >
                    {label}
                  </h2>
                  <p className="text-sm whitespace-nowrap text-muted tabular-nums">
                    <Plural value={shelf.decks.length} one="# deck" other="# decks" />
                  </p>
                </div>
                <ul className="deck-shelf" aria-label={t`${label} decks`}>
                  {shelf.decks.map((deck) => (
                    <li key={deck.slug}>
                      <DeckTile
                        deck={deck}
                        addedTo={data.added[deck.slug] ?? null}
                        onAdd={() =>
                          onAdd({
                            slug: deck.slug,
                            name: deck.name,
                            // The edition this row was read in, so Library says what the shelf said.
                            edition: deck.meaningLanguage,
                          })
                        }
                        adding={adding === deck.slug}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </Screen>
  );
}
