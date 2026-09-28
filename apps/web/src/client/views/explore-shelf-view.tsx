import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreOut, ShelfRoute } from "@lymi/core/catalog";
import { hasShelfPage, shelfAt, shelfRoute, shelvesOf } from "@lymi/core/catalog";
import { Compass } from "lucide-react";
import { useMemo } from "react";
import { Button } from "../components/button";
import { DeckTile } from "../components/deck-tray";
import { EmptySection, ErrorState } from "../components/empty-state";
import { Screen } from "../components/layout/screen";
import { NavLink } from "../components/nav-link";
import { Skeleton } from "../components/skeleton";
import { shelfLabel } from "../lib/explore";

interface Props {
  route: ShelfRoute;
  data: ExploreOut | undefined;
  failed?: boolean | undefined;
  busy?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  onAdd: (deck: { slug: string; name: string; edition: string }) => void;
  adding?: string | undefined;
}

/**
 * One shelf of Explore as a page in the app: every deck on it with Add, as on Explore, then the
 * other shelves of the same kind that have a page. It reads Explore's own list, so the two can never
 * disagree. `docs/design/explore.md`, "Shelf pages".
 */
export function ExploreShelfView({ route, data, failed, busy, onRetry, onAdd, adding }: Props) {
  const { i18n, t } = useLingui();
  const shelves = useMemo(() => shelvesOf(data?.decks ?? []), [data?.decks]);
  const shelf = shelfAt(shelves, route);
  const back = { label: t`Explore`, to: "/explore" };

  if (failed) {
    return (
      <Screen title={undefined} back={back} backOnDesktop>
        <ErrorState
          title={<Trans>Couldn’t load this shelf</Trans>}
          onRetry={onRetry}
          retrying={busy}
        />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title={undefined} back={back} backOnDesktop>
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className="h-9 w-56 rounded-sm" />
          <div className="deck-shelf">
            {[0, 1, 2].map((at) => (
              <Skeleton key={at} className="h-[240px] w-full rounded-lg" />
            ))}
          </div>
        </div>
      </Screen>
    );
  }
  if (!shelf) {
    return (
      <Screen title={undefined} back={back} backOnDesktop>
        <EmptySection
          icon={<Compass />}
          title={<Trans>This shelf has no page</Trans>}
          body={
            <Trans>
              Its decks may have been withdrawn. Every deck Lymi publishes is on Explore.
            </Trans>
          }
          action={
            <Button render={<NavLink to="/explore" />} variant="secondary">
              <Trans>Open Explore</Trans>
            </Button>
          }
        />
      </Screen>
    );
  }

  const label = shelfLabel(i18n, shelf);
  const cards = shelf.decks.reduce((sum, deck) => sum + deck.cardCount, 0);
  const others = shelves.flatMap((other) => {
    const at = shelfRoute(other);
    return other !== shelf && at?.kind === route.kind && hasShelfPage(other)
      ? [{ shelf: other, at }]
      : [];
  });
  return (
    <Screen
      title={label}
      back={back}
      backOnDesktop
      lede={
        <p className="mt-2 text-base text-text-2 tabular-nums">
          <Plural value={shelf.decks.length} one="# deck" other="# decks" />
          <span aria-hidden="true" className="px-1.5 text-faint">
            ·
          </span>
          <Plural value={cards} one="# card" other="# cards" />
        </p>
      }
    >
      <ul className="deck-shelf" aria-label={t`${label} decks`}>
        {shelf.decks.map((deck) => (
          <li key={deck.slug}>
            <DeckTile
              deck={deck}
              addedTo={data.added[deck.slug] ?? null}
              onAdd={() =>
                onAdd({ slug: deck.slug, name: deck.name, edition: deck.meaningLanguage })
              }
              adding={adding === deck.slug}
            />
          </li>
        ))}
      </ul>
      {others.length > 0 && (
        <nav aria-labelledby="more-shelves" className="mt-10 border-t border-edge pt-5">
          <h2 id="more-shelves" className="text-sm text-muted">
            {route.kind === "languages" ? (
              <Trans>More languages</Trans>
            ) : (
              <Trans>Other subjects</Trans>
            )}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map(({ shelf: other, at }) => (
              <li key={other.key}>
                <NavLink
                  to="/explore/$kind/$name"
                  params={{ kind: at.kind, name: at.name }}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-plate-2 px-3.5 text-base font-medium whitespace-nowrap text-text transition-colors duration-150 hoverable:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-11 pointer-coarse:px-4"
                >
                  {shelfLabel(i18n, other)}
                  <span className="text-sm text-muted tabular-nums">{other.decks.length}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </Screen>
  );
}
