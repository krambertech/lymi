import { type Ending, reviewEnd, type Stretch, streakWith } from "@lymi/client/review-end";
import { ListFilter, X } from "lucide-react";
import { LayoutGroup } from "motion/react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { Button } from "../../components/button";
import { FilterReview } from "../../components/filter-review";
import { StaticNavProvider } from "../../components/nav-link";
import { PillNav } from "../../components/pill-nav";
import { GradeBar, ReviewCard, ReviewComplete, ReviewHeader } from "../../views/review-view";
import { type FrameTheme, Phone, useFrameTheme, Variants } from "../frame";
import * as m from "../mock";
import { type Group, noop } from "./types";

/** The deck `m.queueItem` and its siblings belong to. */
const reviewDeck = { name: "Italian with Giulia", language: "it" };

function Shot({
  caption,
  initial,
  children,
}: {
  caption: ReactNode;
  initial: FrameTheme;
  children: (t: FrameTheme) => ReactNode;
}) {
  const { theme, toggle } = useFrameTheme(initial);
  return (
    <figure className="grid gap-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <figcaption className="text-sm text-text-2">{caption}</figcaption>
        {toggle}
      </div>
      {children(theme)}
    </figure>
  );
}

function PhoneShot({
  caption,
  initial,
  path,
  children,
  bare,
}: {
  caption: ReactNode;
  initial: FrameTheme;
  path: string;
  children: ReactNode;
  bare?: boolean | undefined;
}) {
  return (
    <Shot caption={caption} initial={initial}>
      {(t) => (
        <Phone
          theme={t}
          bottom={
            bare ? undefined : (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-6">
                <StaticNavProvider path={path}>
                  <PillNav />
                </StaticNavProvider>
              </div>
            )
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </Phone>
      )}
    </Shot>
  );
}

/**
 * The end of a review, replayable: the last card steps back, the lantern leaves the header and
 * the day lands. Each shot is its own layout group, so lanterns never fly between phones.
 */
function ReviewEndShot({
  caption,
  initial,
  stretch = "day",
  ending = "empty",
  from,
  attempts,
  left = 0,
  elsewhere = 0,
  forgotten = 0,
  deckName,
}: {
  caption: string;
  initial: "light" | "dark";
  stretch?: Stretch | undefined;
  ending?: Ending | undefined;
  from: number;
  attempts: number;
  left?: number | undefined;
  elsewhere?: number | undefined;
  forgotten?: number | undefined;
  deckName?: string | undefined;
}) {
  const group = useId();
  const [ended, setEnded] = useState(true);
  const [run, setRun] = useState(0);
  const goal = 10;
  const result = reviewEnd({
    stretch,
    ending,
    goal,
    from,
    attempts,
    satisfiedBefore: from >= goal,
    left,
    confirmed: true,
    elsewhere,
    forgotten,
  });
  const end = result === "unchecked" ? null : result;
  const past = m.history.slice(0, 6);
  const before = m.streakFrom([...past, from]);
  const after = streakWith(before, attempts, !!end?.satisfied);
  const toGoal = stretch === "day" && from < goal;
  const size = attempts - from + left;
  const round = toGoal ? undefined : { done: attempts - from, size };
  const replay = () => {
    setEnded(false);
    window.setTimeout(() => {
      setRun((n) => n + 1);
      setEnded(true);
    }, 900);
  };
  return (
    <PhoneShot
      caption={
        <span className="flex items-center gap-3">
          {caption}
          <Button size="sm" variant="ghost" onClick={replay}>
            Replay
          </Button>
        </span>
      }
      initial={initial}
      path="/review"
      bare
    >
      <LayoutGroup id={group}>
        <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-3">
          <ReviewHeader
            attempts={ended ? attempts : from}
            goal={toGoal ? Math.min(goal, attempts + left) : goal}
            round={round && (ended ? round : { ...round, done: round.done - 1 })}
            streak={ended ? after : before}
            complete={ended && !!end}
          />
          {ended && end ? (
            <ReviewComplete
              key={run}
              end={end}
              attempts={attempts}
              from={from}
              scopeName={deckName}
              streak={after}
              streakBefore={before}
              done={(variant) => (
                <Button variant={variant} size="lg" className="w-full">
                  Done
                </Button>
              )}
              addCards={
                <Button variant="primary" size="lg" className="w-full">
                  Add cards
                </Button>
              }
            />
          ) : (
            <ReviewCard
              item={m.queueItem}
              deck={reviewDeck}
              revealed={false}
              onReveal={noop}
              className="mt-4"
            />
          )}
        </div>
      </LayoutGroup>
    </PhoneShot>
  );
}

function ReviewPhone({
  revealed: init,
  picture,
}: {
  revealed: boolean;
  picture?: boolean | undefined;
}) {
  const [revealed, setRevealed] = useState(init);
  const item = picture ? m.queueItemPicture : m.queueItem;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
      <ReviewHeader attempts={4} goal={20} />
      <ReviewCard
        item={item}
        deck={reviewDeck}
        section={picture ? undefined : "Lezione 3"}
        revealed={revealed}
        hint={!revealed}
        onReveal={() => setRevealed(true)}
        onPlayAudio={noop}
        className="mt-4"
      />
      <GradeBar revealed={revealed} animateIn next={item.next} onGrade={() => setRevealed(false)} />
    </div>
  );
}

/** A deck page's filter controls with one tag chosen, and the review at the end of its chips. */
function FilteredList({ shown, started, due }: { shown: number; started: number; due: number }) {
  return (
    <div className="grid w-full max-w-[640px] gap-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary">
          <ListFilter data-icon="inline-start" aria-hidden="true" />
          Filter
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-plate-2 ps-3 pe-2 text-sm font-medium text-text-2">
          Tag: casa
          <X className="size-3.5 text-muted" aria-hidden="true" />
        </span>
        <div className="ms-auto">
          <FilterReview shown={shown} started={started} due={due} onReview={noop} />
        </div>
      </div>
    </div>
  );
}

export const review: Group = {
  slug: "review",
  title: "Review",
  lede: "The screen the learner spends their time on, and the only one whose ending is choreographed.",
  entries: [
    {
      slug: "card",
      name: "Card and grades",
      source: "views/review-view.tsx",
      note: "The card itself reveals the answer. Four equally weighted choices use icons and labels without exposing the scheduling algorithm; grading moves to the next card. A picture takes the place of the term when the card asks for it.",
      Demo: () => (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Question" initial="dark" path="/review" bare>
            <ReviewPhone revealed={false} />
          </PhoneShot>
          <PhoneShot caption="Revealed" initial="light" path="/review" bare>
            <ReviewPhone revealed />
          </PhoneShot>
          <PhoneShot caption="Picture → meaning" initial="dark" path="/review" bare>
            <ReviewPhone revealed={false} picture />
          </PhoneShot>
        </div>
      ),
    },
    {
      slug: "filter-review",
      name: "Review a filter’s cards",
      source: "components/filter-review.tsx",
      note: "While a filter or search narrows a deck’s list, the end of the chips’ row says how many cards they show and how many of them are due today. Review 2 due takes the due ones; Review all, quieter still, goes over every card already started and not yet reviewed today, the rest early, for the night before a class. It carries no count, since the cards it leaves out would make a number disagree with the line. Neither is amber: the plate’s Review stays the page’s one primary.",
      Demo: () => (
        <Variants
          stack
          items={[
            {
              label: "Some due",
              note: "Review all leaves the new card out; new cards start in the day’s draw.",
              render: () => <FilteredList shown={6} started={5} due={2} />,
            },
            {
              label: "None due yet",
              note: "Only the quiet early choice.",
              render: () => <FilteredList shown={3} started={3} due={0} />,
            },
            {
              label: "All due",
              note: "Only the due button, since nothing would be early.",
              render: () => <FilteredList shown={4} started={4} due={4} />,
            },
            {
              label: "Only new cards",
              note: "The count alone: new cards start in the day’s draw.",
              render: () => <FilteredList shown={3} started={0} due={0} />,
            },
          ]}
        />
      ),
    },
    {
      slug: "session-end",
      name: "End of session",
      source: "views/review-view.tsx",
      note: "The lantern leaves the header for the middle and rises to full on the way. The count rolls up from where the last end left the day, and embers rise in proportion to what was added; today’s light flares and the run ticks only when the day turns. Each way on is a row that says what it holds; the primary sits last, Continue while the day is open and Done once it is met.",
      Demo: () => (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <ReviewEndShot
            caption="Daily goal reached"
            initial="dark"
            ending="goal"
            from={0}
            attempts={10}
            left={12}
            forgotten={3}
          />
          <ReviewEndShot
            caption="Left below the goal"
            initial="light"
            ending="left"
            from={0}
            attempts={4}
            left={12}
          />
        </div>
      ),
    },
  ],
};
