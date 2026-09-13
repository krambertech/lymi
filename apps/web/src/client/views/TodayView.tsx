import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { Round, RoundsOut } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { AddMenu } from "../components/AddMenu";
import { Button, buttonClass } from "../components/Button";
import { Kbd } from "../components/Kbd";
import { Lantern } from "../components/Lantern";
import { LearnerMenu } from "../components/LearnerMenu";
import { Skeleton } from "../components/Skeleton";
import type { StreakSummary } from "../components/Streak";
import type { DeckSummary } from "../lib/api";
import { lanternFor } from "../lib/flame";
import { Page, PageHeader, type StaticNav, TopBar } from "./Shell";

export interface TodayProps {
  decks: DeckSummary[] | undefined;
  streak: StreakSummary | undefined;
  /** The streak card beside the due card. A slot, so the design page can pass a static one. */
  streakCard?: ReactNode | undefined;
  /** How many cards each round holds. Missing offline, which hides the rounds. */
  rounds?: RoundsOut | undefined;
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

type ReviewSearch = { deck?: string; round?: Round };

/**
 * Home. The due card and the streak card share the top row; under them, the decks that have
 * something due and the rounds that can be reviewed on their own. Rows and round cards are
 * whole links. Nothing here shows a term, so the page never gives an answer away before the
 * review asks for it.
 */
export function TodayView({
  decks,
  streak,
  streakCard,
  rounds,
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
  const loading = decks === undefined || streak === undefined;
  const nothingYet = !loading && total === 0;
  const [onlyDeck] = decks?.length === 1 ? decks : [];

  return (
    <Page>
      {/* The rail carries capture and the learner on desktop, so this row is the phone's. */}
      <TopBar
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
      <PageHeader title={<Trans>Today</Trans>} className="pb-4 @3xl:pb-6" />

      <div className="grid gap-8 @3xl:gap-10">
        <section
          aria-label={t`Today`}
          className={clsx("grid gap-3", !nothingYet && "@3xl:grid-cols-[1.55fr_1fr] @3xl:gap-4")}
        >
          {loading ? (
            <>
              <Skeleton className="h-52 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl @3xl:h-52" />
            </>
          ) : (
            <>
              <div className="edge grid content-between gap-5 rounded-xl bg-plate p-5 @3xl:p-6">
                <div className="flex items-center gap-4">
                  <Lantern
                    className="-my-3 -ms-3 size-24 @3xl:size-28"
                    {...lanternFor(streak)}
                    flicker={!!streak?.current}
                    glow={!!streak?.current}
                  />
                  <DueHeading due={due} nothingYet={nothingYet} onlyDeck={onlyDeck} />
                </div>
                {due > 0 ? (
                  <To
                    to="/review"
                    st={st}
                    className={buttonClass("primary", "lg", "h-16 w-full rounded-lg text-lg")}
                  >
                    <Trans>Review</Trans>
                    <span className="hidden @2xl:contents">
                      <Kbd tone="on-primary">R</Kbd>
                    </span>
                  </To>
                ) : nothingYet ? (
                  <Button
                    variant="primary"
                    size="lg"
                    className="h-16 w-full rounded-lg text-lg"
                    onClick={onCreateDeck}
                    aria-disabled={!onCreateDeck}
                  >
                    <Trans>New deck</Trans>
                  </Button>
                ) : (
                  // Nothing due is not nothing to do: capture is the standing action.
                  <Button
                    variant="primary"
                    size="lg"
                    className="h-16 w-full rounded-lg text-lg"
                    onClick={onAdd}
                    aria-disabled={!onAdd}
                    kbd="N"
                  >
                    <Trans>Add a card</Trans>
                  </Button>
                )}
              </div>
              {!nothingYet && streakCard}
            </>
          )}
        </section>

        {!loading && decks && decks.length > 1 && dueDecks.length > 0 && (
          <section aria-labelledby="today-decks" className="grid gap-2.5">
            <div className="flex min-h-8 items-center justify-between gap-3 px-1">
              <h2 id="today-decks" className="text-lg font-medium">
                <Trans>Decks to review</Trans>
              </h2>
              <To
                to="/library"
                st={st}
                className="relative -me-1 inline-flex items-center gap-0.5 rounded-sm px-1.5 py-1 text-sm font-medium text-text-2 transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] hoverable:hover:text-text"
              >
                <Trans>Library</Trans>
                <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </To>
            </div>
            <ul className="edge overflow-hidden rounded-xl bg-plate">
              {dueDecks.map((d) => (
                <li key={d.id} className="border-edge not-first:border-t">
                  <To
                    to="/review"
                    search={{ deck: d.id }}
                    st={st}
                    className="group flex min-h-18 items-center gap-3 py-3 ps-5 pe-4 transition-[background-color] duration-150 hoverable:hover:bg-hover"
                  >
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-md font-medium">{d.name}</span>
                      <span className="text-sm text-muted tabular-nums">
                        <Trans>
                          <span className="font-semibold text-amber-text">{d.due}</span> due
                        </Trans>
                      </span>
                    </span>
                    <Go>
                      <Trans>Review</Trans>
                    </Go>
                  </To>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!loading && rounds && <Rounds rounds={rounds} st={st} />}
      </div>
    </Page>
  );
}

/** The count and what it counts. With one deck, the deck is named here instead of below. */
function DueHeading({
  due,
  nothingYet,
  onlyDeck,
}: {
  due: number;
  nothingYet: boolean;
  onlyDeck: DeckSummary | undefined;
}) {
  if (nothingYet) {
    return (
      <div className="grid gap-1">
        <h2 className="text-2xl font-medium leading-tight">
          <Trans>Nothing here yet</Trans>
        </h2>
        <p className="text-md text-text-2">
          <Trans>Add a card from your last lesson and the lantern comes on.</Trans>
        </p>
      </div>
    );
  }
  if (due === 0) {
    return (
      <div className="grid gap-1">
        <h2 className="text-2xl font-medium leading-tight">
          <Trans>Nothing due</Trans>
        </h2>
        <p className="text-md text-text-2">
          <Trans>That’s the lot for today.</Trans>
        </p>
      </div>
    );
  }
  const deckName = onlyDeck?.name;
  // One heading, so the count and what it counts are announced together.
  return (
    <h2 className="grid gap-1.5">
      <span className="text-5xl font-medium leading-none tracking-[-0.03em] tabular-nums">
        {due}
      </span>
      <span className="text-md text-text-2">
        {deckName ? (
          <Plural value={due} one={`card due in ${deckName}`} other={`cards due in ${deckName}`} />
        ) : (
          <Plural value={due} one="card due today" other="cards due today" />
        )}
      </span>
    </h2>
  );
}

/** A round's card: how many, what they are, and where the card leads. Hidden when empty. */
function Rounds({ rounds, st }: { rounds: RoundsOut; st: StaticNav }) {
  const { t } = useLingui();
  const items = [
    {
      round: "new" as const,
      count: rounds.new,
      label: t`New cards`,
      detail: t`Not reviewed yet`,
      action: t`Review new`,
    },
    {
      round: "forgotten" as const,
      count: rounds.forgotten,
      label: t`Forgot today`,
      detail: t`Graded Forgot today`,
      action: t`Review forgotten`,
    },
    {
      round: "slipping" as const,
      count: rounds.slipping,
      label: t`Keeps slipping`,
      detail: t`Forgotten 4 or more times`,
      action: t`Review slipping`,
    },
  ].filter((item) => item.count > 0);
  if (items.length === 0) return null;

  return (
    <div className="grid gap-3 @3xl:grid-cols-3 @3xl:gap-4">
      {items.map((item) => (
        <To
          key={item.round}
          to="/review"
          search={{ round: item.round }}
          st={st}
          className="edge group flex items-center gap-4 rounded-xl bg-plate py-4 ps-5 pe-4 transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.98] hoverable:hover:edge-2 hoverable:hover:bg-hover @3xl:flex-col @3xl:items-stretch @3xl:gap-0 @3xl:p-0"
        >
          <span className="min-w-12 text-4xl font-medium leading-none tracking-[-0.03em] tabular-nums @3xl:px-5 @3xl:pt-5 @3xl:pb-3 @3xl:text-5xl">
            {item.count}
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5 @3xl:px-5 @3xl:pb-4">
            <span className="text-md font-medium">{item.label}</span>
            <span className="text-sm text-muted">{item.detail}</span>
          </span>
          <Go className="@3xl:justify-between @3xl:border-t @3xl:border-edge @3xl:py-2.5 @3xl:ps-5 @3xl:pe-3">
            {/* Read on the phone too, where only the arrow shows. */}
            <span className="sr-only @3xl:not-sr-only">{item.action}</span>
          </Go>
        </To>
      ))}
    </div>
  );
}

/** The end of a whole-row link: what it does, then an arrow that strengthens on hover. */
function Go({ children, className }: { children?: ReactNode; className?: string | undefined }) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center gap-2 text-base font-medium text-text-2",
        className,
      )}
    >
      {children}
      <span className="edge-inset grid size-8 place-items-center rounded-full bg-plate-2 text-text transition-[background-color,box-shadow] duration-150 group-hover:bg-plate">
        <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
      </span>
    </span>
  );
}

/** A router link, or a dead anchor carrying the same classes on the design page. */
function To({
  to,
  search,
  st,
  className,
  children,
}: {
  to: "/review" | "/library";
  search?: ReviewSearch | undefined;
  st: StaticNav;
  className?: string | undefined;
  children: ReactNode;
}) {
  if (st) {
    return (
      <a href={to} onClick={(e) => e.preventDefault()} className={className}>
        {children}
      </a>
    );
  }
  return to === "/review" ? (
    <Link to="/review" search={search ?? {}} className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/library" className={className}>
      {children}
    </Link>
  );
}
