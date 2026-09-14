import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { Round, RoundsOut } from "@lymi/core";
import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { ChevronRight, Plus } from "lucide-react";
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
 * Home. The due card and the streak card share the top row; under them, the rounds that can be
 * reviewed on their own, then the decks that have something due. Rows and round cards are
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

        {!loading && !nothingYet && rounds && <Rounds rounds={rounds} onAdd={onAdd} st={st} />}

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

/**
 * The rounds, as rows in one plate. Every row stays, so the list keeps its shape: a round with
 * cards opens its review, and an empty one says so plainly, or offers to add cards.
 */
function Rounds({
  rounds,
  onAdd,
  st,
}: {
  rounds: RoundsOut;
  onAdd: (() => void) | undefined;
  st: StaticNav;
}) {
  const { t } = useLingui();
  const rows = [
    {
      round: "forgotten" as const,
      count: rounds.forgotten,
      label: t`Forgot today`,
      detail: t`Graded Forgot today`,
      empty: t`Nothing forgotten today`,
    },
    {
      round: "new" as const,
      count: rounds.new,
      label: t`New cards`,
      detail: t`Not reviewed yet`,
      empty: t`Add some from your next lesson`,
    },
    {
      round: "slipping" as const,
      count: rounds.slipping,
      label: t`Keeps slipping`,
      detail: t`Forgotten 4 or more times`,
      empty: t`No card keeps slipping`,
    },
  ];
  const row = "flex min-h-18 w-full items-center gap-4 py-3 ps-5 pe-4 text-start";
  const face = (item: (typeof rows)[number], live: boolean) => (
    <>
      <span
        className={clsx(
          "min-w-9 text-3xl font-medium leading-none tracking-[-0.02em] tabular-nums",
          !live && "text-muted",
        )}
      >
        {item.count}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-md font-medium">{item.label}</span>
        <span className="text-sm text-muted">{live ? item.detail : item.empty}</span>
      </span>
    </>
  );

  return (
    <section aria-labelledby="today-more" className="grid gap-2.5">
      <h2 id="today-more" className="flex min-h-8 items-center px-1 text-lg font-medium">
        <Trans>More to review</Trans>
      </h2>
      <ul className="edge overflow-hidden rounded-xl bg-plate">
        {rows.map((item) => (
          <li key={item.round} className="border-edge not-first:border-t">
            {item.count > 0 ? (
              <To
                to="/review"
                search={{ round: item.round }}
                st={st}
                className={clsx(
                  row,
                  "group transition-[background-color] duration-150 hoverable:hover:bg-hover",
                )}
              >
                {face(item, true)}
                <Go>
                  <Trans>Review</Trans>
                </Go>
              </To>
            ) : item.round === "new" ? (
              <button
                type="button"
                onClick={onAdd}
                aria-disabled={!onAdd || undefined}
                className={clsx(
                  row,
                  "group transition-[background-color] duration-150 hoverable:hover:bg-hover",
                )}
              >
                {face(item, false)}
                <Go icon={<Plus className="size-4" aria-hidden="true" />}>
                  <Trans>Add cards</Trans>
                </Go>
              </button>
            ) : (
              <div className={row}>{face(item, false)}</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The end of a whole-row link: what it does, then an arrow that strengthens on hover. */
function Go({
  children,
  icon,
  className,
}: {
  children?: ReactNode;
  /** The glyph in the circle; an arrow unless the row does something other than open. */
  icon?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center gap-2 text-base font-medium text-text-2",
        className,
      )}
    >
      {/* The circle alone on a phone, where the label would squeeze the row's text. */}
      {children && <span className="sr-only @xl:not-sr-only">{children}</span>}
      <span className="edge-inset grid size-8 place-items-center rounded-full bg-plate-2 text-text transition-[background-color,box-shadow] duration-150 group-hover:bg-plate">
        {icon ?? <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />}
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
