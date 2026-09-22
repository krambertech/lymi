import { LayoutGroup } from "motion/react";
import { useId, useState } from "react";
import { Button } from "../../components/button";
import { type Ending, reviewEnd, type Stretch, streakWith } from "../../lib/review-complete";
import { GradeBar, ReviewCard, ReviewComplete, ReviewHeader } from "../../views/review-view";
import { Sidebar } from "../../views/shell";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot, Shot } from "../shot";

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
              deck={m.reviewDeck}
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

export const screen: Screen = {
  order: 40,
  slug: "session-done",
  name: "End of session",
  source: "views/review-view.tsx",
  note: "The lantern leaves the header for the middle and rises to full on the way. The count rolls up from where the last end left the day, and embers rise in proportion to what was added; today’s light flares and the run ticks only when the day turns. Each way on is a row that says what it holds; the primary sits last, Continue while the day is open and Done once it is met.",
  Demo: () => (
    <div className="grid gap-10">
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
        <ReviewEndShot
          caption="A deck crosses the goal and runs out"
          initial="dark"
          stretch="scope"
          from={6}
          attempts={14}
          elsewhere={12}
          deckName="Lesson 14"
        />
        <ReviewEndShot
          caption="Nothing left in a deck, below the goal"
          initial="light"
          stretch="scope"
          from={2}
          attempts={7}
          elsewhere={12}
          deckName="Lesson 14"
        />
        <ReviewEndShot
          caption="Round done, below the goal"
          initial="dark"
          stretch="list"
          from={2}
          attempts={6}
          left={12}
          forgotten={1}
        />
        <ReviewEndShot
          caption="The rest of the day, done"
          initial="light"
          from={10}
          attempts={16}
        />
        <ReviewEndShot
          caption="You’re done for today, below the goal"
          initial="dark"
          from={2}
          attempts={7}
        />
        <ReviewEndShot caption="Nothing due" initial="light" from={0} attempts={0} />
        <Shot caption="Desktop, review" initial="light">
          {(t) => (
            <Desktop theme={t} height={620}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-8 pt-4">
                  <ReviewHeader attempts={4} goal={20} />
                  <ReviewCard
                    item={m.queueItem}
                    revealed
                    onReveal={noop}
                    onPlayAudio={noop}
                    className="mt-5 min-h-[460px] flex-none"
                  />
                  <GradeBar revealed next={m.queueItem.next} onGrade={noop} />
                </div>
              </main>
            </Desktop>
          )}
        </Shot>
      </div>
    </div>
  ),
};
