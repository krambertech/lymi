import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { Button, buttonClass } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { LearnerMenu } from "../components/LearnerMenu";
import { NavLink } from "../components/NavLink";
import type { NewCards } from "../components/NewCardsRow";
import { NewCardsRow } from "../components/NewCardsRow";
import { Skeleton } from "../components/Skeleton";
import { type StreakSummary, StreakWeek } from "../components/Streak";
import type { DeckSummary } from "../lib/api";
import { Page, type StaticNav, TopBar } from "./Shell";

export interface TodayProps {
  decks: DeckSummary[] | undefined;
  /** The streak and the days behind it. The week and the run sit under the button. */
  streak: StreakSummary | undefined;
  /** The streak pill, at the top of the phone's screen. The rail carries it on desktop. */
  streakButton?: ReactNode | undefined;
  /** Cards that landed since the last review, by deck. Empty until the endpoint exists. */
  arrivals?: NewCards[] | undefined;
  /** Worded forecast, e.g. "31 tomorrow, 9 on Monday". */
  forecast?: string | undefined;
  /** The learner, for the avatar that opens their menu on the phone. */
  name?: string | undefined;
  email?: string | undefined;
  /** Something an integration wrote is unseen. Marks Activity in the phone's menu. */
  unseen?: boolean | undefined;
  docsUrl?: string | undefined;
  onAdd?: (() => void) | undefined;
  onCreateDeck?: (() => void) | undefined;
  onSignOut?: (() => void | Promise<void>) | undefined;
  signingOut?: boolean | undefined;
  static?: StaticNav;
}

/**
 * Home. One question and one action: the count is the heading, the lantern is the only object
 * on the screen, and nothing here is a plate except the decks that arrived while you were away.
 * The week and the run sit under the button, never as a panel of their own.
 */
export function TodayView({
  decks,
  streak,
  streakButton,
  arrivals,
  forecast,
  name,
  email,
  unseen,
  docsUrl,
  onAdd,
  onCreateDeck,
  onSignOut,
  signingOut,
  static: st,
}: TodayProps) {
  const { t } = useLingui();
  const due = decks?.reduce((n, d) => n + d.due, 0) ?? 0;
  const total = decks?.reduce((n, d) => n + d.total, 0) ?? 0;
  const dueDecks = decks?.filter((d) => d.due > 0) ?? [];
  /* Both queries gate the hero. It is vertically centred, so a streak block that arrives after
     the decks — or a skeleton that leaves once an empty history lands — would recentre it. */
  const loading = decks === undefined || streak === undefined;
  const nothingYet = !loading && total === 0;
  const lit = due > 0;
  const everReviewed = !!streak && streak.days.length > 0;
  /* With nothing under it the hero would cling to the top of an empty screen, so it takes the
     room instead and centres in it. When something follows, it sits up and gives that the space. */
  const hasArrivals = !!arrivals && arrivals.length > 0;

  /** A link that looks and presses like a button. */
  const To = ({
    to,
    className,
    children,
  }: {
    to: "/review" | "/library" | "/activity";
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
            <Skeleton className="mt-8 h-6 w-36" />
            <Skeleton className="mt-3.5 h-[68px] w-[269px]" />
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
              {nothingYet ? (
                <Trans>Nothing here yet</Trans>
              ) : lit ? (
                <Trans>{due} due</Trans>
              ) : (
                <Trans>Nothing due</Trans>
              )}
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
                <Trans>Review</Trans>
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
                <Trans>Add a card</Trans>
              </Button>
            )}
            {nothingYet && (
              <To
                to="/library"
                className={buttonClass("primary", "lg", "mt-5.5 w-full @3xl:w-auto @3xl:px-10")}
              >
                <Trans>Make a deck</Trans>
              </To>
            )}
          </>
        )}

        {!loading && everReviewed && (
          <div className="mt-8 grid justify-items-center gap-3.5">
            <StreakWeek summary={streak} size="lg" />
            {lit && forecast && <p className="mt-1 text-sm text-muted tabular-nums">{forecast}</p>}
          </div>
        )}
      </section>

      {arrivals && arrivals.length > 0 && (
        <section className="mt-10 grid gap-2" aria-label={t`New since your last review`}>
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
              <Trans>New since your last review</Trans>
            </h2>
            <To
              to="/activity"
              className="relative text-sm font-medium text-amber-text before:absolute before:-inset-x-2 before:-inset-y-3.5 before:content-['']"
            >
              <Trans>Activity</Trans>
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
    return (
      <p className={line}>
        <Trans>Add a card from your last lesson and the lantern comes on.</Trans>
      </p>
    );

  const link = (d: DeckSummary) => (
    <NavLink
      to="/library/$deckId"
      params={{ deckId: d.id }}
      st={st}
      className="relative rounded-xs underline decoration-edge-2 underline-offset-4 transition-[color,text-decoration-color] duration-150 before:absolute before:-inset-y-3 before:content-[''] hoverable:hover:text-text hoverable:hover:decoration-current"
    >
      {d.name}
    </NavLink>
  );
  const [first, second, ...others] = decks.map(link);
  const more = others.length;

  if (!first)
    return (
      <p className={line}>
        {forecast ? (
          <Trans>Coming up: {forecast}.</Trans>
        ) : (
          <Plural
            value={total}
            one="# card in your decks, all ahead of you."
            other="# cards in your decks, all ahead of you."
          />
        )}
      </p>
    );

  if (!second) return <p className={line}>{first}</p>;

  /* The first two are named; the rest are counted, so the line stays one line. */
  if (more === 0)
    return (
      <p className={line}>
        <Trans>
          {first} and {second}
        </Trans>
      </p>
    );

  return (
    <p className={line}>
      <Plural
        value={more}
        one={`${first}, ${second} and # more deck`}
        other={`${first}, ${second} and # more decks`}
      />
    </p>
  );
}
