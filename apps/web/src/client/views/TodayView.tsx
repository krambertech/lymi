import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { Avatar } from "../components/Avatar";
import { buttonClass } from "../components/Button";
import { Lantern } from "../components/Lantern";
import type { NewCards } from "../components/NewCardsRow";
import { NewCardsRow } from "../components/NewCardsRow";
import { Skeleton } from "../components/Skeleton";
import { StreakPill, StreakPlate } from "../components/Streak";
import type { DeckSummary } from "../lib/api";
import { Page, PageHeader, type StaticNav } from "./Shell";

export interface TodayProps {
  decks: DeckSummary[] | undefined;
  /** One review count per day, oldest first, today last. Ninety days feed the streak. */
  history: number[] | undefined;
  /** Cards that landed since the last review, by deck. Empty until the endpoint exists. */
  arrivals?: NewCards[] | undefined;
  /** Worded forecast, e.g. "31 tomorrow, 9 on Monday". */
  forecast?: string | undefined;
  /** The learner, for the avatar that opens You on the phone. */
  name?: string | undefined;
  onAdd?: (() => void) | undefined;
  onCreateDeck?: (() => void) | undefined;
  static?: StaticNav;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

/**
 * Home. One question first: is anything due? The lantern answers it, the button acts on it,
 * and the streak sits beside it on desktop and in the header on the phone. What an integration
 * added since the last review follows, so nothing lands unseen.
 */
export function TodayView({
  decks,
  history,
  arrivals,
  forecast,
  name,
  onAdd,
  onCreateDeck,
  static: st,
}: TodayProps) {
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
    to: "/review" | "/library" | "/activity" | "/you";
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
        title="Today"
        sub={today()}
        actions={
          <>
            {/* The pill until the plate beside the hero takes the streak over. */}
            <span className="@3xl:hidden">
              <StreakPill days={history} />
            </span>
            {/* Capture and the learner, until the rail carries both. */}
            <span className="flex items-center gap-1.5 @3xl/shell:hidden">
              <AddMenu onAddCard={onAdd ?? (() => {})} onCreateDeck={onCreateDeck} align="end" />
              <To
                to="/you"
                className="relative inline-flex rounded-full before:absolute before:-inset-1.5 before:content-['']"
              >
                <Avatar name={name} size={40} />
                <span className="sr-only">You</span>
              </To>
            </span>
          </>
        }
      />

      <div className="grid gap-4 @3xl:grid-cols-3">
        <section className="edge flex flex-col items-center gap-1.5 rounded-xl bg-plate px-5 py-7 text-center @3xl:col-span-2 @3xl:flex-row @3xl:items-center @3xl:gap-7 @3xl:px-7 @3xl:text-left">
          {loading ? (
            <>
              <Skeleton className="size-24 rounded-full" />
              <div className="grid w-full gap-2 @3xl:max-w-xs">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="mt-3 h-12 w-full @3xl:w-32" />
              </div>
            </>
          ) : (
            <>
              <Lantern
                className="size-24 @3xl:size-26"
                variant={lit ? "lit" : "unlit"}
                flicker={lit}
                glow={lit}
              />
              <div className="grid gap-1 @3xl:flex-1">
                <h2 className="text-3xl font-medium tabular-nums">
                  {nothingYet
                    ? "Nothing here yet"
                    : lit
                      ? `${plural(due, "card", "cards")} due`
                      : "Nothing due right now"}
                </h2>
                <p className="text-md text-muted">
                  {nothingYet
                    ? "Add a word from your last lesson and the lantern comes on."
                    : lit
                      ? `Across ${plural(dueDecks, "deck", "decks")}. Ten minutes, maybe less.`
                      : `${plural(total, "card", "cards")} in your decks, all ahead of you.`}
                </p>
                {lit && (
                  <To
                    to="/review"
                    className={buttonClass(
                      "primary",
                      "lg",
                      "mt-5 w-full @3xl:mt-4 @3xl:w-auto @3xl:justify-self-start",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">Review</span>
                  </To>
                )}
                {nothingYet && (
                  <To
                    to="/library"
                    className={buttonClass(
                      "primary",
                      "lg",
                      "mt-5 w-full @3xl:mt-4 @3xl:w-auto @3xl:justify-self-start",
                    )}
                  >
                    <span>Make a deck</span>
                  </To>
                )}
              </div>
            </>
          )}
        </section>

        <StreakPlate days={history} className="hidden @3xl:flex" />
      </div>

      {arrivals && arrivals.length > 0 && (
        <section className="mt-7 grid gap-2" aria-label="New since your last review">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
              New since your last review
            </h2>
            <To
              to="/activity"
              className="relative text-sm font-medium text-amber-text before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-['']"
            >
              Activity
            </To>
          </div>
          {arrivals.map((a) => (
            <NewCardsRow key={a.deckId} {...a} st={st} />
          ))}
        </section>
      )}

      {forecast && !nothingYet && (
        <p className="mt-6 px-1 text-sm text-muted tabular-nums">Coming up: {forecast}</p>
      )}
    </Page>
  );
}
