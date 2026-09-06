import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { buttonClass } from "../components/Button";
import { DeckCard } from "../components/DeckCard";
import { EmptyState } from "../components/EmptyState";
import { Lantern } from "../components/Lantern";
import { Skeleton } from "../components/Skeleton";
import type { DeckSummary } from "../lib/api";
import { Page, PageHeader, type StaticNav } from "./Shell";

export interface LibraryProps {
  decks: DeckSummary[] | undefined;
  /** Cards added since the last review, keyed by deck id. */
  fresh?: Record<string, number> | undefined;
  /** When each deck's next card comes back, keyed by deck id. E.g. "Monday". */
  next?: Record<string, string> | undefined;
  archivedCount?: number | undefined;
  onAdd?: (() => void) | undefined;
  onCreateDeck?: (() => void) | undefined;
  static?: StaticNav;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Every deck, as cards. The review bar sits above them so the daily action is reachable from
 * here too, without Review needing a place in the navigation.
 */
export function LibraryView({
  decks,
  fresh,
  next,
  archivedCount,
  onAdd,
  onCreateDeck,
  static: st,
}: LibraryProps) {
  const due = decks?.reduce((n, d) => n + d.due, 0) ?? 0;
  const total = decks?.reduce((n, d) => n + d.total, 0) ?? 0;
  const dueDecks = decks?.filter((d) => d.due > 0).length ?? 0;
  const loading = decks === undefined;

  const To = ({
    to,
    className,
    children,
  }: {
    to: "/review" | "/archived";
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
      <PageHeader
        title="Library"
        sub={
          loading
            ? undefined
            : `${plural(decks.length, "deck", "decks")} · ${plural(total, "card", "cards")}`
        }
        actions={
          <AddMenu onAddCard={onAdd ?? (() => {})} onCreateDeck={onCreateDeck} align="end" />
        }
      />

      {due > 0 && (
        <section className="edge mb-5 flex items-center gap-3.5 rounded-lg bg-plate py-3 pl-4 pr-3">
          <Lantern className="size-10" flicker glow />
          <span className="grid min-w-0 flex-1">
            <span className="text-md font-medium tabular-nums">{due} due</span>
            <span className="text-sm text-muted">across {plural(dueDecks, "deck", "decks")}</span>
          </span>
          <To to="/review" className={buttonClass("primary", "md", "px-5")}>
            <span>Review</span>
          </To>
        </section>
      )}

      {loading && (
        <div className="grid gap-2">
          <Skeleton className="h-[86px] rounded-lg" />
          <Skeleton className="h-[86px] rounded-lg" />
          <Skeleton className="h-[86px] rounded-lg" />
        </div>
      )}

      {decks && decks.length === 0 && (
        <EmptyState
          lantern="none"
          title="No decks yet"
          body="One per lesson works well, or one per topic. You can move cards later."
          className="py-6"
        />
      )}

      {decks && decks.length > 0 && (
        <ul className="grid gap-2">
          {decks.map((d) => (
            <li key={d.id}>
              <DeckCard
                id={d.id}
                name={d.name}
                language={d.defaultLanguage}
                due={d.due}
                total={d.total}
                fresh={fresh?.[d.id]}
                next={next?.[d.id]}
                st={st}
              />
            </li>
          ))}
        </ul>
      )}

      {archivedCount ? (
        <div className="mt-7 flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Archived</h2>
          <To to="/archived" className="text-sm font-medium text-amber-text">
            Show {archivedCount}
          </To>
        </div>
      ) : null}
    </Page>
  );
}
