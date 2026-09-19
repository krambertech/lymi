import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ExploreOut } from "@lymi/core/catalog";
import { shelvesOf } from "@lymi/core/catalog";
import { Compass } from "lucide-react";
import { useMemo } from "react";
import { AddMenu } from "../components/add-menu";
import { DeckTile } from "../components/deck-tray";
import { EmptySection, ErrorState } from "../components/empty-state";
import { LearnerMenu } from "../components/learner-menu";
import type { StaticNav } from "../components/nav-link";
import { Skeleton } from "../components/skeleton";
import { shelfLabel } from "../lib/explore";
import { Page, PageHeader, TileLockup, TopBar } from "./shell";

interface Props {
  data: ExploreOut | undefined;
  failed?: boolean | undefined;
  busy?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  onAdd: (deck: { slug: string; name: string; edition: string }) => void;
  /** The slug currently being added, so only its own tile waits. */
  adding?: string | undefined;
  /** The phone bar carries the learner, since the rail that usually does is not there. */
  name?: string | undefined;
  email?: string | undefined;
  docsUrl?: string | undefined;
  onAddCard?: (() => void) | undefined;
  onCreateDeck?: (() => void) | undefined;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  st?: StaticNav;
}

/**
 * Explore in the app: every deck Lymi publishes, a shelf per category, each scrolling sideways so
 * a category of forty decks lengthens one row instead of burying the page. It reads the same
 * projection as `lymi.app/explore`, so the two can never disagree. ADR 0016, `docs/design/explore.md`.
 */
export function ExploreView({
  data,
  failed,
  busy,
  onRetry,
  onAdd,
  adding,
  name,
  email,
  docsUrl,
  onAddCard,
  onCreateDeck,
  onSignOut,
  signingOut,
  st,
}: Props) {
  const { i18n, t } = useLingui();
  const shelves = useMemo(() => shelvesOf(data?.decks ?? []), [data?.decks]);

  return (
    <Page>
      <TopBar
        back={<TileLockup size="bar" />}
        actions={
          <>
            <AddMenu onAddCard={onAddCard ?? (() => {})} onCreateDeck={onCreateDeck} align="end" />
            <LearnerMenu
              variant="phone"
              name={name}
              email={email}
              docsUrl={docsUrl ?? "/"}
              onSignOut={onSignOut}
              signingOut={signingOut}
              static={st}
            />
          </>
        }
      />
      {/* No count here: each shelf below counts its own, as it does on the public page. */}
      <PageHeader title={<Trans>Explore</Trans>}>
        <p className="mt-2 max-w-[52ch] text-base text-text-2">
          <Trans>Ready-made decks from Lymi. Add one to study it in your language.</Trans>
        </p>
      </PageHeader>

      {failed ? (
        <ErrorState
          title={<Trans>Couldn’t load Explore</Trans>}
          onRetry={onRetry}
          retrying={busy}
        />
      ) : !data ? (
        <div className="grid gap-3" aria-hidden="true">
          <Skeleton className="h-8 w-44 rounded-sm" />
          <div className="flex gap-[22px] overflow-hidden pt-5">
            {[0, 1, 2].map((at) => (
              <div key={at} className="grid w-[216px] shrink-0 gap-3.5">
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
        shelves.map((shelf) => {
          const label = shelfLabel(i18n, shelf.key);
          const headingId = `shelf-${shelf.key}`;
          return (
            <section key={shelf.key} aria-labelledby={headingId} className="mt-8 first:mt-0">
              <div className="flex items-baseline justify-between gap-5 border-b border-edge pb-3">
                <h2 id={headingId} className="text-lg font-medium text-text">
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
                      st={st}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </Page>
  );
}
