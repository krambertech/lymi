import { streakLength } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { Avatar } from "../components/Avatar";
import { Button, buttonClass } from "../components/Button";
import { Flame } from "../components/Flame";
import { Lantern } from "../components/Lantern";
import { NavLink } from "../components/NavLink";
import type { NewCards } from "../components/NewCardsRow";
import { NewCardsRow } from "../components/NewCardsRow";
import { SevenLights } from "../components/SevenLights";
import { Skeleton } from "../components/Skeleton";
import type { DeckSummary } from "../lib/api";
import { Page, type StaticNav } from "./Shell";

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

/**
 * Home. One question and one action: the count is the heading, the lantern is the only object
 * on the screen, and nothing here is a plate except the decks that arrived while you were away.
 * The streak is the seven lights and one line under the button, never a panel of its own.
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
  const dueDecks = decks?.filter((d) => d.due > 0) ?? [];
  const loading = decks === undefined;
  const nothingYet = !loading && total === 0;
  const lit = due > 0;
  const run = history ? streakLength(history) : 0;
  const everReviewed = !!history?.some((n) => n > 0);
  /* With nothing under it the hero would cling to the top of an empty screen, so it takes the
     room instead and centres in it. When something follows, it sits up and gives that the space. */
  const hasArrivals = !!arrivals && arrivals.length > 0;

  /** A link that looks and presses like a button. */
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
    <Page width="md">
      {/* The rail carries capture and the learner on desktop, so this row is the phone's. */}
      <header className="flex min-h-10 items-center gap-1.5 @3xl/shell:hidden">
        <span className="ml-auto flex items-center gap-1.5">
          <AddMenu onAddCard={onAdd ?? (() => {})} onCreateDeck={onCreateDeck} align="end" />
          <To
            to="/you"
            className="relative inline-flex rounded-full before:absolute before:-inset-1.5 before:content-['']"
          >
            <Avatar name={name} size={40} />
            <span className="sr-only">You</span>
          </To>
        </span>
      </header>

      <section
        className={clsx(
          "grid justify-items-center gap-1 text-center",
          hasArrivals ? "pt-6 @3xl:pt-10" : "flex-1 content-center pb-14",
        )}
      >
        {loading ? (
          <>
            <Skeleton className="size-30 rounded-full @3xl:size-32" />
            <Skeleton className="mt-3.5 h-10 w-40" />
            <Skeleton className="mt-2 h-5 w-56" />
            <Skeleton className="mt-5.5 h-14 w-full rounded-lg @3xl:w-44" />
          </>
        ) : (
          <>
            <Lantern
              className="size-30 @3xl:size-32"
              variant={lit ? "lit" : "unlit"}
              flicker={lit}
              glow={lit}
            />
            <h1 className="mt-3.5 text-4xl font-medium tabular-nums">
              {nothingYet ? "Nothing here yet" : lit ? `${due} due` : "Nothing due"}
            </h1>
            <DeckLine
              decks={dueDecks}
              nothingYet={nothingYet}
              total={total}
              forecast={forecast}
              st={st}
            />

            {lit && (
              <To
                to="/review"
                className={buttonClass("primary", "lg", "mt-5.5 w-full @3xl:w-auto @3xl:px-10")}
              >
                Review
              </To>
            )}
            {/* Nothing due is not nothing to do: capture is the standing action, and the one
                the evening after a session is actually for. */}
            {!lit && !nothingYet && (
              <Button
                variant="primary"
                size="lg"
                className="mt-5.5 w-full @3xl:w-auto @3xl:px-10"
                onClick={onAdd}
                aria-disabled={!onAdd}
                kbd="N"
              >
                Add a word
              </Button>
            )}
            {nothingYet && (
              <To
                to="/library"
                className={buttonClass("primary", "lg", "mt-5.5 w-full @3xl:w-auto @3xl:px-10")}
              >
                Make a deck
              </To>
            )}
          </>
        )}

        {/* The streak sits outside the branch above: it arrives on its own query, after the
            decks, and the hero is centred, so it has to hold its room in both states or the
            whole screen jolts upward when the lights land. */}
        {loading || history === undefined ? (
          <div className="mt-8 grid justify-items-center gap-3.5" aria-hidden="true">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-[68px] w-[269px]" />
          </div>
        ) : (
          everReviewed && (
            <div className="mt-8 grid justify-items-center gap-3.5">
              {/* The flame counts the run; the lights say which days and how full each was.
                  One statement each, which is the whole of the streak. */}
              <p className="flex items-center gap-2 text-md font-medium tabular-nums text-text-2">
                <Flame className="size-7" flicker={run > 0} />
                {run === 0 ? "No streak yet" : `${plural(run, "day", "days")} in a row`}
              </p>
              <SevenLights days={history.slice(-7)} size="lg" />
              {lit && forecast && (
                <p className="mt-1 text-sm text-muted tabular-nums">{forecast}</p>
              )}
            </div>
          )
        )}
      </section>

      {arrivals && arrivals.length > 0 && (
        <section className="mt-10 grid gap-2" aria-label="New since your last review">
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
    </Page>
  );
}

/**
 * The line under the count. When cards are due it names the decks they are in and each name
 * starts that deck's review, so the page finally knows what the rail knows. Otherwise it says
 * what is coming, which is the one thing that decides whether tonight needs anything extra.
 */
function DeckLine({
  decks,
  nothingYet,
  total,
  forecast,
  st,
}: {
  decks: DeckSummary[];
  nothingYet: boolean;
  total: number;
  forecast: string | undefined;
  st: StaticNav;
}) {
  const line = "mt-2 text-md text-text-2";

  if (nothingYet)
    return <p className={line}>Add a word from your last lesson and the lantern comes on.</p>;

  if (decks.length === 0)
    return (
      <p className={line}>
        {forecast
          ? `Coming up: ${forecast}.`
          : `${plural(total, "card", "cards")} in your decks, all ahead of you.`}
      </p>
    );

  const shown = decks.slice(0, 2);
  const rest = decks.length - shown.length;
  return (
    <p className={line}>
      {shown.map((d, i) => (
        <span key={d.id}>
          {i > 0 && (rest > 0 ? ", " : " and ")}
          <NavLink
            to="/library/$deckId"
            params={{ deckId: d.id }}
            st={st}
            className="relative rounded-xs underline decoration-edge-2 underline-offset-4 transition-[color,text-decoration-color] duration-150 before:absolute before:-inset-y-3 before:content-[''] hoverable:hover:text-text hoverable:hover:decoration-current"
          >
            {d.name}
          </NavLink>
        </span>
      ))}
      {rest > 0 && ` and ${plural(rest, "more deck", "more decks")}`}
    </p>
  );
}
