import { LayoutGroup } from "motion/react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { identifyApp } from "../components/app-mark";
import { Button } from "../components/button";
import { CardForm } from "../components/card-form";
import { ShellChrome } from "../components/layout/shell-chrome";
import { NewDeckForm } from "../components/new-deck-sheet";
import { PillNav } from "../components/pill-nav";
import { StreakButton } from "../components/streak";
import { reviewEnd, type Stretch, streakWith } from "../lib/review-complete";
import { ActivityView } from "../views/activity-view";
import { ConnectedView } from "../views/connected-view";
import { ConsentView } from "../views/consent-view";
import { DeckDetailView } from "../views/deck-detail-view";
import { DeckSettingsView } from "../views/deck-settings-view";
import { ExploreDeckView } from "../views/explore-deck-view";
import { ExploreView } from "../views/explore-view";
import { InsightsView } from "../views/insights-view";
import { LibraryView } from "../views/library-view";
import { LoginView } from "../views/login-view";
import { ResetPasswordView } from "../views/reset-password-view";
import { GradeBar, ReviewCard, ReviewComplete, ReviewHeader } from "../views/review-view";
import { SettingsView } from "../views/settings-view";
import { Sidebar } from "../views/shell";
import { TodayView } from "../views/today-view";
import { WordView } from "../views/word-view";
import { designChrome } from "./chrome";
import { Desktop, type FrameTheme, Phone, useFrameTheme } from "./frame";
import * as m from "./mock";
import type { Entry } from "./parts/types";
import { SheetPreview } from "./sheet-preview";

/** The import rows drawn in place, since the design page never leaves itself. */
const staticImportLink = (_source: string, className: string, children: ReactNode) => (
  <span className={className}>{children}</span>
);

const noop = () => {};
/** Activity's rows are drawn in place too: the design page never leaves itself. */
const staticRowLink = (_id: unknown, className: string, children: ReactNode) => (
  <span className={className}>{children}</span>
);
const staticCardLink = (_deck: string, _card: string, className: string, children: ReactNode) => (
  <span className={className}>{children}</span>
);
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
                <PillNav static={{ path }} />
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

const CLAUDE = identifyApp("https://claude.ai/oauth/client", "Claude");
const UNKNOWN = identifyApp("https://notes.example.com/mcp/client", "Notebook");

/** The consent screen with its switch live, so the grant dots can be tried on the design page. */
function ConsentDemo({ app }: { app: typeof CLAUDE }) {
  const [write, setWrite] = useState(true);
  return (
    <ConsentView
      app={app}
      email="kateryna@example.com"
      writeRequested
      allowWrite={write}
      onAllowWrite={setWrite}
      onDecide={noop}
    />
  );
}

/**
 * The end of a review, replayable: the last card steps back, the lantern leaves the header and
 * the day lands. Each shot is its own layout group, so lanterns never fly between phones.
 */
function ReviewEndShot({
  caption,
  initial,
  stretch = "goal",
  from,
  attempts,
  left = 0,
  forgotten = 0,
  deckName,
}: {
  caption: string;
  initial: "light" | "dark";
  stretch?: Stretch | undefined;
  from: number;
  attempts: number;
  left?: number | undefined;
  forgotten?: number | undefined;
  deckName?: string | undefined;
}) {
  const group = useId();
  const [ended, setEnded] = useState(true);
  const [run, setRun] = useState(0);
  const goal = 10;
  const result = reviewEnd({
    stretch,
    goal,
    from,
    attempts,
    satisfiedBefore: from >= goal,
    left,
    confirmed: true,
    scoped: !!deckName,
    forgotten,
    otherDecks: deckName ? m.decks.filter((d) => d.name !== deckName) : [],
  });
  const end = result === "unchecked" ? null : result;
  const past = m.history.slice(0, 6);
  const before = m.streakFrom([...past, from]);
  const after = streakWith(before, attempts, !!end?.satisfied);
  const round = stretch === "goal" ? undefined : { done: attempts - from, size: attempts - from };
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
            goal={goal}
            round={round && (ended ? round : { ...round, done: round.size - 1 })}
            streak={ended ? after : before}
            complete={ended && !!end}
          />
          {ended && end ? (
            <ReviewComplete
              key={run}
              end={end}
              attempts={attempts}
              goal={goal}
              from={from}
              roundCount={attempts - from}
              scopeName={deckName}
              streak={after}
              streakBefore={before}
              actions={
                end.heading === "nothing_due" ? (
                  <>
                    <Button variant="primary" size="lg" className="w-full">
                      Add cards
                    </Button>
                    <Button variant="secondary" size="lg" className="w-full">
                      Done
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="lg" className="w-full">
                    Done
                  </Button>
                )
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
  produce,
  picture,
}: {
  revealed: boolean;
  produce?: boolean | undefined;
  picture?: boolean | undefined;
}) {
  const [revealed, setRevealed] = useState(init);
  const item = picture ? m.queueItemPicture : produce ? m.queueItemProduce : m.queueItem;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
      <ReviewHeader attempts={4} goal={20} />
      <ReviewCard
        item={item}
        deck={reviewDeck}
        revealed={revealed}
        hint={!revealed}
        onReveal={() => setRevealed(true)}
        onPlayAudio={noop}
        className="mt-4"
      />
      <GradeBar
        id={!produce && !picture ? "review-grade-preview" : undefined}
        revealed={revealed}
        animateIn
        next={item.next}
        onGrade={() => setRevealed(false)}
      />
    </div>
  );
}

/** Every screen, rendered from the real views with sample data. */
export const SCREENS: Entry[] = [
  {
    slug: "today",
    name: "Today",
    source: "views/today-view.tsx",
    note: "The due card and the streak card share the top row: the lantern beside how many cards are due, one full-width Review button, and the run with its seven lights. Under them, the rounds as three tiles that keep their place when empty, then the decks with cards due when there is more than one deck, where a series is one row. Rows are whole links, and no term appears, so the page never gives an answer away. Until the first review, Today is the getting started guide.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Cards due" initial="dark" path="/today">
            <TodayView
              decks={m.decks}
              streak={m.streak}
              streakCard={<StreakButton variant="card" summary={m.streak} />}
              rounds={m.rounds}
              static={{ path: "/today" }}
            />
          </PhoneShot>
          <PhoneShot caption="A series due" initial="light" path="/today">
            <TodayView
              decks={m.decksInSeries}
              series={m.series}
              streak={m.streak}
              streakCard={<StreakButton variant="card" summary={m.streak} />}
              rounds={m.rounds}
              static={{ path: "/today" }}
            />
          </PhoneShot>
          <PhoneShot caption="Nothing due" initial="light" path="/today">
            <ShellChrome
              value={designChrome("/today", m.streakFrom(m.streakDaysOpen.map((n) => n * 2)))}
            >
              <TodayView
                decks={m.quietDecks}
                streak={m.streakFrom(m.streakDaysOpen.map((n) => n * 2))}
                streakCard={
                  <StreakButton
                    variant="card"
                    summary={m.streakFrom(m.streakDaysOpen.map((n) => n * 2))}
                  />
                }
                rounds={{ forgotten: 9, new: 0, slipping: 0 }}
                static={{ path: "/today" }}
              />
            </ShellChrome>
          </PhoneShot>
          <PhoneShot caption="First run" initial="light" path="/today">
            <TodayView
              connectUrl="https://lymi.app/docs/mcp"
              decks={[]}
              streak={m.streakFrom(m.noHistory)}
              static={{ path: "/today" }}
            />
          </PhoneShot>
        </div>
        <Shot caption="Desktop, Today" initial="light">
          {(t) => (
            <Desktop theme={t} height={720}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                streak={<StreakButton variant="rail" summary={m.streak} />}
                static={{ path: "/today" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <TodayView
                  decks={m.decks}
                  streak={m.streak}
                  streakCard={<StreakButton variant="card" summary={m.streak} />}
                  rounds={m.rounds}
                  static={{ path: "/today" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
      </div>
    ),
  },
  {
    slug: "insights",
    name: "Insights",
    source: "views/insights-view.tsx",
    note: "The one screen where charts belong, and the only one where looking at them is a choice. Four numbers, each with the line that makes it mean something. Every figure draws in ink; the lights and today’s bar on Ahead stay amber, because those are the streak and the day you can act on. The last frame is the first week, when Recall draws its sample rather than a trend it does not have.",
    Demo: () => (
      <div className="grid gap-10">
        <Shot caption="Desktop, Insights" initial="light">
          {(t) => (
            <Desktop theme={t} height={720}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/insights" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <InsightsView data={m.insights} period="30" onPeriod={noop} />
              </main>
            </Desktop>
          )}
        </Shot>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="On the phone" initial="dark" path="/insights">
            <InsightsView data={m.insights} period="30" onPeriod={noop} />
          </PhoneShot>
          <PhoneShot caption="The first week" initial="light" path="/insights">
            <InsightsView data={m.thinInsights} period="30" onPeriod={noop} />
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "review",
    name: "Review",
    source: "views/review-view.tsx",
    note: "The card itself reveals the answer. Four equally weighted choices use icons and labels without exposing the scheduling algorithm; grading moves to the next card.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Question" initial="dark" path="/review" bare>
            <ReviewPhone revealed={false} />
          </PhoneShot>
          <PhoneShot caption="Revealed" initial="light" path="/review" bare>
            <ReviewPhone revealed />
          </PhoneShot>
          <PhoneShot caption="Production direction, revealed" initial="dark" path="/review" bare>
            <ReviewPhone revealed produce />
          </PhoneShot>
          <PhoneShot caption="Picture → meaning" initial="light" path="/review" bare>
            <ReviewPhone revealed={false} picture />
          </PhoneShot>
          <PhoneShot caption="Picture → meaning, revealed" initial="dark" path="/review" bare>
            <ReviewPhone revealed picture />
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "session-done",
    name: "End of session",
    source: "views/review-view.tsx",
    note: "The lantern leaves the header for the middle and rises to full on the way. The count rolls up by what the review added, today’s light fills and the run ticks; a round that reaches the goal fills the light without the tick, and an end that changes nothing about the day stays quiet. Each way on is a row that says what it holds; Done is the one primary action.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <ReviewEndShot
            caption="Daily goal reached"
            initial="dark"
            from={0}
            attempts={10}
            left={12}
            forgotten={3}
          />
          <ReviewEndShot
            caption="A round reaches the goal"
            initial="light"
            stretch="list"
            from={7}
            attempts={12}
            left={12}
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
            caption="Round done, goal already met"
            initial="light"
            stretch="more"
            from={10}
            attempts={20}
            left={8}
          />
          <ReviewEndShot
            caption="Nothing left in a deck"
            initial="dark"
            from={2}
            attempts={7}
            deckName="Lesson 14"
          />
          <ReviewEndShot caption="You’re done for today" initial="light" from={2} attempts={7} />
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
  },
  {
    slug: "library",
    name: "Library",
    source: "views/library-view.tsx",
    note: "Library is every deck as a card: its name, whether it has cards due today, and its language and size. Decks without a series come first; each series follows under its own heading with its decks in order and one Review for all of them. A deck is two plates, today's and the deck's split, over its words as a glossary under Filter and Sort. A word opens with everything Lymi knows about it and its whole history: beside the list when both fit, otherwise as a side sheet on desktop and a drawer on a phone.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Library" initial="light" path="/library">
            <LibraryView decks={m.decks} next={{ d3: "Monday" }} static={{ path: "/library" }} />
          </PhoneShot>
          <PhoneShot caption="With a series" initial="dark" path="/library">
            <LibraryView
              decks={m.decksInSeries}
              series={m.series}
              onNewSeries={noop}
              onEditSeries={noop}
              onDeleteSeries={noop}
              static={{ path: "/library" }}
            />
          </PhoneShot>
          <PhoneShot caption="A deck" initial="dark" path="/library">
            <DeckDetailView
              deck={m.decks[0]}
              cards={m.deckCards}
              streak={m.streak}
              onAdd={noop}
              onArchive={noop}
              openCardId={null}
              static={{ path: "/library/d1" }}
            />
          </PhoneShot>
          <PhoneShot caption="A deck with sections" initial="light" path="/library">
            <DeckDetailView
              deck={m.decks[0]}
              cards={m.deckCardsInSections}
              streak={m.streak}
              onAdd={noop}
              onArchive={noop}
              openCardId={null}
              sections={m.sections}
              progress={m.sectionProgress}
              onStartSection={noop}
              static={{ path: "/library/d1" }}
            />
          </PhoneShot>
          <PhoneShot caption="A deck that is gone" initial="light" path="/library">
            <DeckDetailView
              deck={undefined}
              cards={undefined}
              onAdd={noop}
              onArchive={noop}
              failure="gone"
              static={{ path: "/library/gone" }}
            />
          </PhoneShot>
          <PhoneShot caption="A deck that would not load" initial="dark" path="/library">
            <DeckDetailView
              deck={undefined}
              cards={undefined}
              onAdd={noop}
              onArchive={noop}
              failure="unreachable"
              onRetry={noop}
              static={{ path: "/library/d1" }}
            />
          </PhoneShot>
          <PhoneShot caption="A card" initial="light" path="/library">
            <div className="px-5 pt-5">
              <WordView
                card={m.deckCards[2]?.card ?? m.queueItem.card}
                state={m.deckCards[2]?.state ?? null}
                deckName={m.decks[0]?.name ?? ""}
                reviews={m.wordReviews}
                events={m.wordEvents}
                onEdit={noop}
                onArchive={noop}
                onMove={noop}
                onClose={noop}
                decks={m.decks}
                hasNext
              />
            </div>
          </PhoneShot>
        </div>
        <Shot caption="Desktop, Library" initial="dark">
          {(t) => (
            <Desktop theme={t} height={620}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/library" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <LibraryView
                  decks={m.decks}
                  next={{ d3: "Monday" }}
                  static={{ path: "/library" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
        <Shot caption="Desktop, a deck whose next section is ready, as its owner" initial="dark">
          {(t) => (
            <Desktop theme={t} height={760}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/library/d1" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <DeckDetailView
                  deck={{ ...m.decks[0], due: 0 } as NonNullable<(typeof m.decks)[0]>}
                  cards={m.deckCardsInSections}
                  onAdd={noop}
                  onArchive={noop}
                  streak={m.streak}
                  openCardId={null}
                  sections={m.readySections}
                  progress={m.readyProgress}
                  onStartSection={noop}
                  sectionActions={{
                    onCreate: noop,
                    onRename: noop,
                    onAddCard: noop,
                    onManage: noop,
                    onPickSection: noop,
                    onMoveCards: noop,
                  }}
                  static={{ path: "/library/d1" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
        <Shot caption="Desktop, a deck with a card open beside it" initial="light">
          {(t) => (
            <Desktop theme={t} height={760}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/library/d1" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <DeckDetailView
                  deck={m.decks[0]}
                  cards={m.deckCards}
                  onAdd={noop}
                  onArchive={noop}
                  streak={m.streak}
                  openCardId="c6"
                  reviews={m.wordReviews}
                  events={m.wordEvents}
                  onEditCard={noop}
                  decks={m.decks}
                  cardBeside
                  static={{ path: "/library/d1" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Add a card" initial="dark" path="/library" bare>
            <div className="flex flex-1 flex-col justify-end bg-scrim">
              <SheetPreview shape="drawer" title="Add a card">
                <CardForm
                  mode="add"
                  layout="chips"
                  decks={m.decks}
                  deckId="d1"
                  onCancel={noop}
                  onSubmit={() => undefined}
                  static
                />
              </SheetPreview>
            </div>
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "making-a-deck",
    name: "Making a deck",
    source: "views/deck-settings-view.tsx",
    note: "A deck is a name and two settings, so creating one is a sheet rather than a wizard: the name is the field that matters and the rest already has an answer. The sheet takes the shape of the machine it is on: a drawer under the thumb on the phone, a centred modal on a desktop, same form inside both. Everything chosen there can be changed afterwards on the deck's own settings screen, which is a screen and not a sheet because the back gesture should work and the direction choice needs room to say what it does. Nothing there has a Save button.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="New deck" initial="light" path="/library" bare>
            <div className="flex flex-1 flex-col justify-end bg-scrim">
              <SheetPreview shape="drawer" title="New deck">
                <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
              </SheetPreview>
            </div>
          </PhoneShot>
          <PhoneShot caption="Deck settings" initial="dark" path="/library">
            <DeckSettingsView
              deck={m.decks[2]}
              example={{
                term: "затишок",
                meaning: "a cosy, sheltered spot",
              }}
              onSave={noop}
              saved
            />
          </PhoneShot>
        </div>
        <Shot caption="Desktop, the same sheet as a modal" initial="light">
          {(t) => (
            <Desktop theme={t} height={560}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/library" }}
              />
              <main className="@container relative flex min-w-0 flex-1 flex-col">
                <LibraryView decks={m.decks} static={{ path: "/library" }} />
                <div className="absolute inset-0 grid place-items-center bg-scrim">
                  <SheetPreview shape="dialog" title="New deck" className="w-[min(92%,440px)]">
                    <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                  </SheetPreview>
                </div>
              </main>
            </Desktop>
          )}
        </Shot>
        <Shot caption="Desktop, deck settings" initial="light">
          {(t) => (
            <Desktop theme={t} height={720}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/library/d3" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <DeckSettingsView
                  deck={m.decks[2]}
                  example={{
                    term: "затишок",
                    meaning: "a cosy, sheltered spot",
                  }}
                  onSave={noop}
                  onArchive={noop}
                />
              </main>
            </Desktop>
          )}
        </Shot>
      </div>
    ),
  },
  {
    slug: "settings",
    name: "Settings",
    source: "views/settings-view.tsx",
    note: "A reading screen, narrowed to 672. One group per concern, separated by rules rather than boxes. A choice applies when it is made, so nothing here has a Save button.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="On the phone" initial="dark" path="/settings">
            <SettingsView
              me={m.me}
              language="en"
              onLanguage={noop}
              theme="system"
              onTheme={noop}
              importLink={staticImportLink}
            />
          </PhoneShot>
        </div>
        <Shot caption="Desktop, Settings" initial="light">
          {(t) => (
            <Desktop theme={t} height={640}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/settings" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <SettingsView
                  me={m.me}
                  language="en"
                  onLanguage={noop}
                  theme="system"
                  onTheme={noop}
                  importLink={staticImportLink}
                />
              </main>
            </Desktop>
          )}
        </Shot>
      </div>
    ),
  },
  {
    slug: "activity",
    name: "Activity",
    source: "views/activity-view.tsx",
    note: "What came into the decks from outside the app and what went out of it, newest first under day headings. A row is one sentence that never names the caller, because the line under it does; the mark is the verb. Writes of one kind by one caller in one deck on one day are one row, and a row that wrote cards opens them in place rather than sending the learner away.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="A week of writes" initial="dark" path="/activity">
            <ActivityView
              entries={m.activity}
              today={m.activityToday}
              onRetry={noop}
              importLink={staticRowLink}
              deckLink={staticRowLink}
              cardLink={staticCardLink}
            />
          </PhoneShot>
          <PhoneShot caption="Nothing has come in yet" initial="light" path="/activity">
            <ActivityView
              entries={[]}
              onRetry={noop}
              importLink={staticRowLink}
              deckLink={staticRowLink}
              cardLink={staticCardLink}
            />
          </PhoneShot>
        </div>
        <Shot caption="Desktop, Activity" initial="light">
          {(t) => (
            <Desktop theme={t} height={640}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/today" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <ActivityView
                  entries={m.activity}
                  today={m.activityToday}
                  onRetry={noop}
                  importLink={staticRowLink}
                  deckLink={staticRowLink}
                  cardLink={staticCardLink}
                />
              </main>
            </Desktop>
          )}
        </Shot>
      </div>
    ),
  },
  {
    slug: "sign-in",
    name: "Sign in",
    source: "views/login-view.tsx",
    note: "The front door has one job: sign in. Google stays the first control, and the email form sits under one rule as the other way in; only that form changes when the learner asks to create an account or reset a password. When an MCP client sent the learner here, its verified identity appears inside that same focused panel.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Sign in" initial="dark" path="/login" bare>
            <LoginView onGoogle={noop} />
          </PhoneShot>
          <PhoneShot caption="Create an account" initial="light" path="/login" bare>
            <LoginView onGoogle={noop} mode="sign-up" />
          </PhoneShot>
          <PhoneShot caption="Reset a password" initial="light" path="/login" bare>
            <LoginView mode="forgot" />
          </PhoneShot>
          <PhoneShot caption="The link is on its way" initial="dark" path="/login" bare>
            <LoginView
              mode="sign-up"
              notice={{
                title: "Check your inbox",
                body: "Check ada@example.com. A message is on the way with the next step.",
                actions: (
                  <>
                    <Button size="sm" variant="secondary">
                      Send it again
                    </Button>
                    <Button size="sm" variant="ghost">
                      Back to sign in
                    </Button>
                  </>
                ),
              }}
            />
          </PhoneShot>
          <PhoneShot caption="Sent here by an app" initial="light" path="/login" bare>
            <LoginView onGoogle={noop} app={CLAUDE} />
          </PhoneShot>
          <PhoneShot caption="Sign-in failed" initial="dark" path="/login" bare>
            <LoginView
              onGoogle={noop}
              error="That email and password don’t match. Try again, or reset your password."
            />
          </PhoneShot>
          <PhoneShot caption="A password a guesser opens with" initial="dark" path="/login" bare>
            <LoginView
              onGoogle={noop}
              mode="sign-up"
              email="ada@example.com"
              password="password123"
              passwordError="That password is one of the first an attacker tries. Choose another."
            />
          </PhoneShot>
          <PhoneShot caption="A password worth keeping" initial="light" path="/login" bare>
            <LoginView
              onGoogle={noop}
              mode="sign-up"
              email="ada@example.com"
              password="thunder-oyster-lamp"
            />
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "explore",
    name: "Explore",
    source: "views/explore-view.tsx",
    note: "Every deck Lymi publishes, inside the app. A shelf per category, wrapping into as many rows as its decks need, so every deck is on the page. A deck is one of its own cards in a tray, in a hue hashed from its slug alone — eight of them, so two side by side is the price of a colour that never moves as the catalogue grows. The tray sits inside a card here, unlike the public page, because the Add on it has to belong to something; Add is secondary, because a shelf of decks has no single thing to press. A deck already in Library says so and leads there.",
    Demo: () => (
      <div className="grid gap-10">
        <Shot caption="Desktop, Explore" initial="light">
          {(t) => (
            <Desktop theme={t} height={760}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/explore" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <ExploreView
                  data={{ decks: m.catalogue, added: m.catalogueAdded }}
                  onAdd={noop}
                  st={{ path: "/explore" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="On the phone" initial="dark" path="/explore">
            <ExploreView
              data={{ decks: m.catalogue, added: m.catalogueAdded }}
              onAdd={noop}
              st={{ path: "/explore" }}
            />
          </PhoneShot>
          <PhoneShot caption="Before the first deck is published" initial="light" path="/explore">
            <ExploreView data={{ decks: [], added: {} }} onAdd={noop} st={{ path: "/explore" }} />
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "explore-deck",
    name: "A published deck",
    source: "views/explore-deck-view.tsx",
    note: "One published deck without leaving the app, on the same column and title as every other screen. Its colour stays on its tray rather than washing the page: a band of it ended on an arbitrary edge against the rail and put amber on a coloured ground, where amber stops reading as the one thing to press. The tray here shows its card whole and hugs the text, because one cropped card standing alone reads as a fault instead of a shelf. Sections say what opens first; every card is one disclosure away, since the full list is what a learner checks before committing.",
    Demo: () => (
      <div className="grid gap-10">
        <Shot caption="Desktop, a deck the learner has not added" initial="light">
          {(t) => (
            <Desktop theme={t} height={760}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                docsUrl="https://lymi.app/docs"
                onAdd={noop}
                static={{ path: "/explore" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <ExploreDeckView
                  data={{ deck: m.publicDeck, deckId: null }}
                  onAdd={noop}
                  st={{ path: "/explore" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Already in the library" initial="dark" path="/explore">
            <ExploreDeckView
              data={{ deck: m.publicDeck, deckId: "d2" }}
              onAdd={noop}
              st={{ path: "/explore" }}
            />
          </PhoneShot>
          <PhoneShot caption="Withdrawn since the link was shared" initial="light" path="/explore">
            <ExploreDeckView data={undefined} missing onAdd={noop} st={{ path: "/explore" }} />
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "set-a-password",
    name: "Set a password",
    source: "views/reset-password-view.tsx",
    note: "The second half of a reset, opened from the email. It is the login panel with one field, so the learner never leaves the door they started at. A spent link says so and offers a new one rather than a dead form.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Set a new password" initial="dark" path="/reset-password" bare>
            <ResetPasswordView />
          </PhoneShot>
          <PhoneShot caption="Too short" initial="light" path="/reset-password" bare>
            <ResetPasswordView password="short" passwordError="Use at least 8 characters." />
          </PhoneShot>
          <PhoneShot caption="The link is spent" initial="light" path="/reset-password" bare>
            <ResetPasswordView expired />
          </PhoneShot>
          <PhoneShot caption="Saved" initial="dark" path="/reset-password" bare>
            <ResetPasswordView done />
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "consent",
    name: "Consent",
    source: "views/consent-view.tsx",
    note: "The stop between an app's sign-in and its first request. Read is stated, because a connector cannot work without it; write is the only decision, so it is the only control. A recognised host is named; anything else is titled by its address, and its own name is shown as a claim.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="A recognised app" initial="light" path="/consent" bare>
            <ConsentDemo app={CLAUDE} />
          </PhoneShot>
          <PhoneShot caption="An app Lymi does not recognise" initial="dark" path="/consent" bare>
            <ConsentDemo app={UNKNOWN} />
          </PhoneShot>
        </div>
      </div>
    ),
  },
  {
    slug: "connected",
    name: "Connected",
    source: "views/connected-view.tsx",
    note: "The ending. An MCP client's redirect is usually a custom scheme, so the browser hands off and leaves the tab here; the rail draws across and the flame rises. This is the only choreography outside review.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Connected, read and write" initial="dark" path="/consent" bare>
            <ConnectedView app={CLAUDE} scopes={{ read: true, write: true }} />
          </PhoneShot>
          <PhoneShot caption="Denied" initial="light" path="/consent" bare>
            <ConnectedView app={CLAUDE} refused />
          </PhoneShot>
        </div>
      </div>
    ),
  },
];
