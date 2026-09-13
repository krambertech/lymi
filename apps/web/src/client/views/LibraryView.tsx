import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { Button } from "../components/Button";
import { DeckCard } from "../components/DeckCard";
import { EmptyState } from "../components/EmptyState";
import { LearnerMenu } from "../components/LearnerMenu";
import { Skeleton } from "../components/Skeleton";
import type { DeckSummary } from "../lib/api";
import { Page, PageHeader, type StaticNav, TopBar } from "./Shell";

export interface LibraryProps {
  decks: DeckSummary[] | undefined;
  /** How many cards in each deck FSRS calls known, and how many are on the way, by deck id. */
  known?: Record<string, number> | undefined;
  learning?: Record<string, number> | undefined;
  /** When each deck's next card comes back, keyed by deck id. E.g. "Monday". */
  next?: Record<string, string> | undefined;
  archivedCount?: number | undefined;
  onAdd?: (() => void) | undefined;
  onCreateDeck?: (() => void) | undefined;
  /** The learner, for the avatar that opens their menu on the phone. */
  name?: string | undefined;
  email?: string | undefined;
  unseen?: boolean | undefined;
  docsUrl?: string | undefined;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  /** The streak pill, beside capture on the phone. The rail carries it on desktop. */
  streakButton?: ReactNode | undefined;
  static?: StaticNav;
}

/**
 * Every deck, as a card with a face: its name and language, how its words are split, and
 * what it asks of you today. Nothing here reviews or searches: Today owns the daily review,
 * and a deck owns its own. Archived decks are a category of their own under the live ones.
 */
export function LibraryView({
  decks,
  known,
  learning,
  next,
  archivedCount,
  onAdd,
  onCreateDeck,
  name,
  email,
  unseen,
  docsUrl,
  onSignOut,
  signingOut,
  streakButton,
  static: st,
}: LibraryProps) {
  const { t } = useLingui();
  const total = decks?.reduce((n, d) => n + d.total, 0) ?? 0;
  const loading = decks === undefined;

  const To = ({
    to,
    className,
    children,
  }: {
    to: "/archived";
    className?: string | undefined;
    children: ReactNode;
  }) =>
    st ? (
      <a href={to} onClick={(e) => e.preventDefault()} className={className}>
        {children}
      </a>
    ) : (
      <Link to={to} className={className}>
        {children}
      </Link>
    );

  return (
    <Page>
      <TopBar
        back={streakButton}
        actions={
          <>
            <AddMenu onAddCard={onAdd ?? (() => {})} onCreateDeck={onCreateDeck} align="end" />
            <LearnerMenu
              variant="phone"
              name={name}
              email={email}
              unseen={unseen}
              docsUrl={docsUrl ?? "/"}
              onSignOut={onSignOut}
              signingOut={signingOut}
              static={st}
            />
          </>
        }
      />
      <PageHeader
        title={t`Library`}
        sub={
          loading
            ? undefined
            : t`${plural(decks.length, { one: "# deck", other: "# decks" })} · ${plural(total, { one: "# card", other: "# cards" })}`
        }
      />

      {loading && (
        <div className="grid gap-3 @3xl:grid-cols-2">
          <Skeleton className="h-[118px] rounded-lg" />
          <Skeleton className="h-[118px] rounded-lg" />
          <Skeleton className="h-[118px] rounded-lg" />
        </div>
      )}

      {decks && decks.length === 0 && (
        <EmptyState
          lantern="none"
          title={t`No decks yet`}
          body={t`One per course works well, or one per topic. Cards remember which lesson they came from.`}
          action={
            <Button variant="primary" onClick={onCreateDeck} aria-disabled={!onCreateDeck}>
              <Plus aria-hidden="true" />
              <Trans>New deck</Trans>
            </Button>
          }
          className="py-6"
        />
      )}

      {decks && decks.length > 0 && (
        <ul className="grid gap-3 @3xl:grid-cols-2">
          {decks.map((d) => (
            <li key={d.id} className="flex min-w-0">
              <DeckCard
                id={d.id}
                name={d.name}
                language={d.defaultLanguage}
                due={d.due}
                total={d.total}
                known={known?.[d.id]}
                learning={learning?.[d.id]}
                next={next?.[d.id]}
                st={st}
              />
            </li>
          ))}
          <li className="flex min-w-0">
            {/* Dashed rather than amber: capture is the standing action, and a second amber
                thing on the page would make the due counts read as buttons. */}
            <button
              type="button"
              onClick={onCreateDeck}
              aria-disabled={!onCreateDeck}
              className="flex min-h-[72px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge-2 text-base font-medium text-text-2 transition-[background-color,color,scale] duration-150 active:scale-[0.98] hoverable:hover:bg-plate hoverable:hover:text-text"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
              <Trans>New deck</Trans>
            </button>
          </li>
        </ul>
      )}

      {archivedCount ? (
        <section className="mt-8">
          <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.06em] text-muted">
            <Trans>Archived</Trans>
          </h2>
          <To
            to="/archived"
            className="edge flex items-center justify-between gap-3 rounded-lg bg-plate px-4 py-3.5 text-base transition-[background-color,box-shadow] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover"
          >
            <span className="font-medium">
              <Plural value={archivedCount} one="# archived deck" other="# archived decks" />
            </span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <Trans>Show</Trans>
              <ChevronRight className="size-4 text-faint" aria-hidden="true" />
            </span>
          </To>
        </section>
      ) : null}
    </Page>
  );
}
