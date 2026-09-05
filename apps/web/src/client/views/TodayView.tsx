import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { buttonClass } from "../components/Button";
import { Kbd } from "../components/Kbd";
import { Lantern } from "../components/Lantern";
import { SevenLights } from "../components/SevenLights";
import { Skeleton } from "../components/Skeleton";
import type { DeckSummary } from "../lib/api";
import { DeckRow, Page, PageHeader, type StaticNav } from "./Shell";

export interface TodayProps {
  decks: DeckSummary[] | undefined;
  /** Seven counts, oldest first. Undefined while loading. */
  history: number[] | undefined;
  static?: StaticNav;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Home. One question: is anything due? The lantern is lit and glowing when there is, dark
 * when there is not. Decks follow as a quiet list.
 */
export function TodayView({ decks, history, static: st }: TodayProps) {
  const due = decks?.reduce((n, d) => n + d.due, 0) ?? 0;
  const total = decks?.reduce((n, d) => n + d.total, 0) ?? 0;
  const dueDecks = decks?.filter((d) => d.due > 0).length ?? 0;
  const loading = decks === undefined;
  const nothingYet = !loading && total === 0;
  const lit = due > 0;

  /** A link that looks and presses like the primary button. */
  const To = ({
    to,
    className,
    children,
  }: {
    to: "/review" | "/decks";
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
      <PageHeader title="Today" />
      <section className="flex min-h-[440px] flex-col items-center justify-center gap-2 py-8 text-center @3xl:py-12">
        {loading ? (
          <>
            <Skeleton className="mb-4 size-32 rounded-full" />
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-60" />
          </>
        ) : lit ? (
          <>
            <Lantern className="mb-4 size-32 @3xl:size-36" flicker glow />
            <h2 className="text-3xl font-medium tabular-nums">
              {plural(due, "card", "cards")} due
            </h2>
            <p className="max-w-[30ch] text-md text-muted">
              Across {plural(dueDecks, "deck", "decks")}. Ten minutes, maybe less.
            </p>
            <div className="mt-6 w-full @3xl:w-auto">
              <To
                to="/review"
                className={buttonClass(
                  "primary",
                  "lg",
                  "h-14 w-full text-lg @3xl:h-12 @3xl:w-auto @3xl:text-md",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  Review {due} due
                  <span className="hidden @2xl:contents">
                    <Kbd tone="on-primary">R</Kbd>
                  </span>
                </span>
              </To>
            </div>
          </>
        ) : nothingYet ? (
          <>
            <Lantern className="mb-4 size-32 @3xl:size-36" variant="unlit" />
            <h2 className="text-3xl font-medium">Nothing here yet</h2>
            <p className="max-w-[30ch] text-md text-muted">
              Make a deck, add a word from your last lesson, and the lantern comes on.
            </p>
            <div className="mt-6">
              <To to="/decks" className={buttonClass("primary", "lg")}>
                <span>Make a deck</span>
              </To>
            </div>
          </>
        ) : (
          <>
            <Lantern className="mb-4 size-32 @3xl:size-36" variant="unlit" />
            <h2 className="text-3xl font-medium">Nothing due right now</h2>
            <p className="max-w-[30ch] text-md text-muted">
              {plural(total, "card", "cards")} in your decks. Add something from today’s lesson
              while it’s fresh?
            </p>
          </>
        )}
        {!nothingYet && (
          <div className="mt-7">
            {history ? <SevenLights days={history} /> : <Skeleton className="h-9 w-40" />}
          </div>
        )}
      </section>

      {decks && decks.length > 0 && (
        <section className="mt-2 grid gap-2" aria-label="Decks">
          {decks.map((d) => (
            <DeckRow
              key={d.id}
              name={d.name}
              due={d.due}
              total={d.total}
              href={`/decks/${d.id}`}
              st={st}
            />
          ))}
        </section>
      )}
    </Page>
  );
}
