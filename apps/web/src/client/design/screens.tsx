import { LayoutGroup } from "motion/react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { AddCardForm } from "../components/add-card-sheet";
import { identifyApp } from "../components/app-mark";
import { Button } from "../components/button";
import { NewDeckForm } from "../components/new-deck-sheet";
import { PillNav } from "../components/pill-nav";
import { StreakButton } from "../components/streak";
import { type DayOutcome, streakWith } from "../lib/review-complete";
import { ConnectedView } from "../views/connected-view";
import { ConsentView } from "../views/consent-view";
import { DeckDetailView } from "../views/deck-detail-view";
import { DeckSettingsView } from "../views/deck-settings-view";
import { InsightsView } from "../views/insights-view";
import { LibraryView } from "../views/library-view";
import { LoginView } from "../views/login-view";
import { GradeBar, ReviewCard, ReviewComplete, ReviewHeader } from "../views/review-view";
import { SettingsView } from "../views/settings-view";
import { Sidebar } from "../views/shell";
import { TodayView } from "../views/today-view";
import { Desktop, type FrameTheme, Phone, useFrameTheme } from "./frame";
import * as m from "./mock";
import type { Entry } from "./parts/types";
import { SheetPreview } from "./sheet-preview";

const noop = () => {};
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
  outcome,
  from,
  attempts,
  forgotten = 0,
  nextRound = 0,
}: {
  caption: string;
  initial: "light" | "dark";
  outcome: DayOutcome;
  from: number;
  attempts: number;
  forgotten?: number | undefined;
  nextRound?: number | undefined;
}) {
  const group = useId();
  const [ended, setEnded] = useState(true);
  const [run, setRun] = useState(0);
  const past = m.history.slice(0, 6);
  const before = m.streakFrom([...past, outcome === "nothing_due" ? 0 : from]);
  const after = streakWith(before, attempts, outcome !== "nothing_due");
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
            goal={10}
            streak={ended ? after : before}
            complete={ended}
          />
          {ended ? (
            <ReviewComplete
              key={run}
              outcome={outcome}
              attempts={attempts}
              from={from}
              streak={after}
              streakBefore={before}
              forgotten={forgotten}
              nextRound={nextRound}
              actions={
                outcome === "nothing_due" ? (
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
        className="pt-3"
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
    note: "The due card and the streak card share the top row: the lantern beside how many cards are due, one full-width Review button, and the run with its seven lights. Under them, the rounds as three tiles that keep their place when empty, then the decks with cards due when there is more than one deck. Rows are whole links, and no term appears, so the page never gives an answer away.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Cards due" initial="dark" path="/today">
            <TodayView
              decks={m.decks}
              streak={m.streak}
              streakCard={<StreakButton variant="card" summary={m.streak} />}
              streakButton={<StreakButton variant="phone" summary={m.streak} />}
              rounds={m.rounds}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              static={{ path: "/today" }}
            />
          </PhoneShot>
          <PhoneShot caption="Nothing due" initial="light" path="/today">
            <TodayView
              decks={m.quietDecks}
              streak={m.streakFrom(m.streakDaysOpen.map((n) => n * 2))}
              streakCard={
                <StreakButton
                  variant="card"
                  summary={m.streakFrom(m.streakDaysOpen.map((n) => n * 2))}
                />
              }
              streakButton={
                <StreakButton
                  variant="phone"
                  summary={m.streakFrom(m.streakDaysOpen.map((n) => n * 2))}
                />
              }
              rounds={{ forgotten: 9, new: 0, slipping: 0 }}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
              static={{ path: "/today" }}
            />
          </PhoneShot>
          <PhoneShot caption="First run" initial="light" path="/today">
            <TodayView
              decks={[]}
              streak={m.streakFrom(m.noHistory)}
              streakButton={<StreakButton variant="phone" summary={m.streakFrom(m.noHistory)} />}
              name={m.me.name}
              docsUrl="https://lymi.app/docs"
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
                  name={m.me.name}
                  docsUrl="https://lymi.app/docs"
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
    note: "The one screen where charts belong, and the only one where looking at them is a choice. Four numbers, each with the line that makes it mean something. Every figure draws in ink; the lights and the peak stay amber, because those are the streak and the thing to notice. The last frame is the first week, when almost nothing has happened yet.",
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
    note: "The lantern leaves the header for the middle and rises to full on the way. The count rolls up by what the review added, today’s light fills and the run ticks. Carrying on is offered as two rows that say what they hold; Done is the one primary action.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <ReviewEndShot
            caption="Daily goal reached"
            initial="dark"
            outcome="goal_met"
            from={0}
            attempts={10}
            forgotten={3}
            nextRound={10}
          />
          <ReviewEndShot
            caption="That’s the lot"
            initial="light"
            outcome="exhausted"
            from={2}
            attempts={7}
            forgotten={1}
          />
          <ReviewEndShot
            caption="Nothing due"
            initial="light"
            outcome="nothing_due"
            from={0}
            attempts={0}
          />
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
                    <GradeBar revealed next={m.queueItem.next} onGrade={noop} className="pt-3" />
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
    note: "Library is every deck as a card: its name, whether it has cards due today, and its language and size. A deck is its cards in a plain list, with state as the filter above it rather than a pill on the row. A word is a page with everything Lymi knows about it and its whole history; on desktop the same page sits beside the list.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Library" initial="light" path="/library">
            <LibraryView
              decks={m.decks}
              next={{ d3: "Monday" }}
              archivedCount={2}
              name={m.me.name}
              streakButton={<StreakButton variant="phone" summary={m.streak} />}
              docsUrl="https://lymi.app/docs"
              static={{ path: "/library" }}
            />
          </PhoneShot>
          <PhoneShot caption="A deck" initial="dark" path="/library">
            <DeckDetailView
              deck={m.decks[0]}
              cards={m.deckCards}
              onAdd={noop}
              onArchive={noop}
              openCardId={null}
              static={{ path: "/library/d1" }}
            />
          </PhoneShot>
          <PhoneShot caption="A card" initial="light" path="/library">
            <DeckDetailView
              deck={m.decks[0]}
              cards={m.deckCards}
              onAdd={noop}
              onArchive={noop}
              openCardId="c6"
              reviews={m.wordReviews}
              events={m.wordEvents}
              onSaveCard={noop}
              decks={m.decks}
              static={{ path: "/library/d1" }}
            />
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
                  archivedCount={2}
                  static={{ path: "/library" }}
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
                  openCardId="c6"
                  reviews={m.wordReviews}
                  events={m.wordEvents}
                  onSaveCard={noop}
                  decks={m.decks}
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
                <AddCardForm
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
              static={{ path: "/library" }}
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
                <LibraryView decks={m.decks} archivedCount={9} static={{ path: "/library" }} />
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
                  static={{ path: "/library/d3" }}
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
            <SettingsView me={m.me} language="en" onLanguage={noop} theme="system" onTheme={noop} />
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
    note: "The front door has one job: sign in. The lantern and plain wordmark sit above one centered task. When an MCP client sent the learner here, its verified identity appears inside that same focused panel.",
    Demo: () => (
      <div className="grid gap-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Sign in" initial="dark" path="/login" bare>
            <LoginView onGoogle={noop} />
          </PhoneShot>
          <PhoneShot caption="Sent here by an app" initial="light" path="/login" bare>
            <LoginView onGoogle={noop} app={CLAUDE} />
          </PhoneShot>
          <PhoneShot caption="Sign-in failed" initial="light" path="/login" bare>
            <LoginView onGoogle={noop} error="Sign-in didn’t finish. Try again." />
          </PhoneShot>
          <PhoneShot caption="Not on the invite list" initial="dark" path="/login" bare>
            <LoginView
              onGoogle={noop}
              blocked
              error="This Google account has not been invited. Request an invitation, or try another account."
            />
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
