import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreOut, Shelf } from "@lymi/core/catalog";
import { hasShelfPage, shelfRoute, shelvesOf } from "@lymi/core/catalog";
import { ChevronRight, Compass } from "lucide-react";
import { useMemo, useRef } from "react";
import { DeckTile } from "../components/deck-tray";
import { EmptySection, ErrorState } from "../components/empty-state";
import { Screen } from "../components/layout/screen";
import { NavLink } from "../components/nav-link";
import { ShelfBar, shelfId } from "../components/shelf-bar";
import { Skeleton } from "../components/skeleton";
import { shelfLabel } from "../lib/explore";
import { useColumns } from "../lib/use-columns";

interface Props {
  data: ExploreOut | undefined;
  failed?: boolean | undefined;
  busy?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  onAdd: (deck: { slug: string; name: string; edition: string }) => void;
  /** The slug currently being added, so only its own tile waits. */
  adding?: string | undefined;
}

/**
 * One shelf. Where the shelf has a page of its own it shows the decks that fit one row and leads to
 * the rest; a shelf with no page shows every deck, since nothing else would lead to them.
 */
function ShelfSection({
  shelf,
  added,
  onAdd,
  adding,
}: {
  shelf: Shelf;
  added: ExploreOut["added"];
  onAdd: Props["onAdd"];
  adding: string | undefined;
}) {
  const { i18n, t } = useLingui();
  const list = useRef<HTMLUListElement>(null);
  const columns = useColumns(list, 216, 22);
  const label = shelfLabel(i18n, shelf);
  const headingId = shelfId(shelf.key);
  const route = shelfRoute(shelf);
  const page = route && hasShelfPage(shelf) ? route : null;
  const decks = page ? shelf.decks.slice(0, columns) : shelf.decks;
  return (
    <section aria-labelledby={headingId} className="mt-8 first:mt-0">
      <div className="flex items-baseline justify-between gap-5 border-b border-edge pb-3">
        <h2
          id={headingId}
          tabIndex={-1}
          className="scroll-mt-20 text-lg font-medium text-text focus:outline-none"
        >
          {label}
        </h2>
        {page ? (
          <NavLink
            to="/explore/$kind/$name"
            params={{ kind: page.kind, name: page.name }}
            className="inline-flex shrink-0 items-center gap-1 rounded-xs text-sm font-medium whitespace-nowrap text-text-2 transition-colors duration-150 hoverable:hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Trans>See all</Trans>
            <span className="font-normal text-muted tabular-nums">{shelf.decks.length}</span>
            <ChevronRight aria-hidden="true" className="size-4 text-muted rtl:-scale-x-100" />
          </NavLink>
        ) : (
          <p className="text-sm whitespace-nowrap text-muted tabular-nums">
            <Plural value={shelf.decks.length} one="# deck" other="# decks" />
          </p>
        )}
      </div>
      <ul ref={list} className="deck-shelf" aria-label={t`${label} decks`}>
        {decks.map((deck) => (
          <li key={deck.slug}>
            <DeckTile
              deck={deck}
              addedTo={added[deck.slug] ?? null}
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
}

/**
 * Explore in the app: every deck Lymi publishes, a shelf per language and then per subject, each
 * wrapping into as many rows as its decks need, under a bar of shelves that stays at the top. It reads the same projection as `lymi.app/explore`, so the two can never
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
          {shelves.length > 1 && <ShelfBar shelves={shelves} />}
          {shelves.map((shelf) => (
            <ShelfSection
              key={shelf.key}
              shelf={shelf}
              added={data.added}
              onAdd={onAdd}
              adding={adding}
            />
          ))}
        </>
      )}
    </Screen>
  );
}
