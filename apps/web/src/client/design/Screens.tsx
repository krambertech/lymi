import type { ReactNode } from "react";
import { useState } from "react";
import { AddCardForm } from "../components/AddCardSheet";
import { identifyApp } from "../components/AppMark";
import { Button } from "../components/Button";
import { NewDeckForm } from "../components/NewDeckSheet";
import { PillNav } from "../components/PillNav";
import { SheetPanel } from "../components/Sheet";
import { ConnectedView } from "../views/ConnectedView";
import { ConsentView } from "../views/ConsentView";
import { DeckDetailView } from "../views/DeckDetailView";
import { DeckSettingsView } from "../views/DeckSettingsView";
import { InsightsView } from "../views/InsightsView";
import { LibraryView } from "../views/LibraryView";
import { LoginView } from "../views/LoginView";
import { GradeBar, ReviewCard, ReviewHeader, SessionDone } from "../views/ReviewView";
import { Sidebar } from "../views/Shell";
import { TodayView } from "../views/TodayView";
import { YouView } from "../views/YouView";
import { Desktop, type FrameTheme, Phone, Section, Sub, useFrameTheme } from "./Frame";
import * as m from "./mock";

const noop = () => {};

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

function ReviewPhone({
  revealed: init,
  produce,
}: {
  revealed: boolean;
  produce?: boolean | undefined;
}) {
  const [revealed, setRevealed] = useState(init);
  const item = produce ? m.queueItemProduce : m.queueItem;
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-3">
      <ReviewHeader done={4} total={11} />
      <ReviewCard
        item={item}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onPlayAudio={noop}
        className="mt-4"
      />
      <GradeBar
        id={!produce ? "review-grade-preview" : undefined}
        revealed={revealed}
        next={item.next}
        onGrade={() => setRevealed(false)}
        className={revealed ? "grade-enter mt-3" : "mt-3"}
      />
    </div>
  );
}

export function Screens() {
  return (
    <Section
      id="screens"
      title="Screens"
      lede="Every frame here renders the real view components with sample data. Flip any one between rooms. The phone lays out as a phone because the views respond to their container, not the window."
    >
      <Sub
        title="Today"
        note="One question and one action. The lantern is lit and glowing when cards are due, dark when they are not, and the count under it is the heading. The decks holding the due cards are named and each name opens that deck. The streak is the seven lights and one line, on both screens. What an integration added since the last review follows."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Cards due" initial="dark" path="/">
            <TodayView
              decks={m.decks}
              history={m.streakDays}
              arrivals={m.arrivals}
              forecast="31 tomorrow, 9 on Monday"
              name={m.me.name}
              static={{ path: "/" }}
            />
          </PhoneShot>
          <PhoneShot caption="Nothing due" initial="light" path="/">
            <TodayView
              decks={m.quietDecks}
              history={m.streakDaysOpen}
              forecast="31 tomorrow, 9 on Monday"
              name={m.me.name}
              static={{ path: "/" }}
            />
          </PhoneShot>
          <PhoneShot caption="First run" initial="light" path="/">
            <TodayView decks={[]} history={m.noHistory} name={m.me.name} static={{ path: "/" }} />
          </PhoneShot>
        </div>
        <Shot caption="Desktop, Today" initial="light">
          {(t) => (
            <Desktop theme={t} height={560}>
              <Sidebar decks={m.decks} name={m.me.name} onAdd={noop} static={{ path: "/" }} />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <TodayView
                  decks={m.decks}
                  history={m.streakDays}
                  arrivals={m.arrivals}
                  forecast="31 tomorrow, 9 on Monday"
                  name={m.me.name}
                  static={{ path: "/" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
      </Sub>

      <Sub
        title="Insights"
        note="The one screen where charts belong, and the only one where looking at them is a choice. Four numbers, each with the line that makes it mean something. Every figure draws in ink; the lights and the peak stay amber, because those are the streak and the thing to notice. The last frame is the first week, when almost nothing has happened yet."
      >
        <Shot caption="Desktop, Insights" initial="light">
          {(t) => (
            <Desktop theme={t} height={720}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
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
      </Sub>

      <Sub
        id="review-preview"
        title="Review"
        note="The card itself reveals the answer. Four equally weighted choices use icons and labels without exposing the scheduling algorithm; grading moves to the next card."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Question" initial="dark" path="/review" bare>
            <ReviewPhone revealed={false} />
          </PhoneShot>
          <PhoneShot caption="Revealed" initial="light" path="/review" bare>
            <ReviewPhone revealed />
          </PhoneShot>
          <PhoneShot caption="Produce direction, revealed" initial="dark" path="/review" bare>
            <ReviewPhone revealed produce />
          </PhoneShot>
        </div>
      </Sub>

      <Sub
        id="session-done-preview"
        title="End of session"
        note="The lantern lights up and stays. Cards counted, not points. The week’s lights show what the day added."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="That’s the lot" initial="dark" path="/review" bare>
            <div className="flex flex-1 flex-col px-4">
              <ReviewHeader done={11} total={11} />
              <SessionDone
                done={11}
                deckName="Lesson 14"
                history={m.history}
                action={
                  <Button variant="primary" size="lg">
                    Done
                  </Button>
                }
              />
            </div>
          </PhoneShot>
          <Shot caption="Desktop, review" initial="light">
            {(t) => (
              <Desktop theme={t} height={620}>
                <Sidebar decks={m.decks} name={m.me.name} onAdd={noop} static={{ path: "/" }} />
                <main className="@container flex min-w-0 flex-1 flex-col">
                  <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-8 pt-4">
                    <ReviewHeader done={4} total={11} />
                    <ReviewCard
                      item={m.queueItem}
                      revealed
                      onReveal={noop}
                      onPlayAudio={noop}
                      className="mt-5 min-h-[400px] flex-none"
                    />
                    <GradeBar revealed next={m.queueItem.next} onGrade={noop} className="mt-3" />
                  </div>
                </main>
              </Desktop>
            )}
          </Shot>
        </div>
      </Sub>

      <Sub
        title="Library, capture and You"
        note="Decks are cards, two lines each, under a review bar. Capture is a sheet with one field that matters. You holds the profile, what integrations wrote, and every setting, so none of them needs a slot in the navigation."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Library" initial="light" path="/library">
            <LibraryView
              decks={m.decks}
              fresh={{ d1: 12 }}
              next={{ d3: "Monday" }}
              archivedCount={9}
              static={{ path: "/library" }}
            />
          </PhoneShot>
          <PhoneShot caption="Add a word" initial="dark" path="/library" bare>
            <div className="flex flex-1 flex-col justify-end bg-scrim">
              <div className="edge-2 rounded-t-xl bg-plate">
                <SheetPanel variant="drawer" title="Add a word or phrase" titleHidden>
                  <AddCardForm
                    decks={m.decks}
                    deckId="d1"
                    onCancel={noop}
                    onSubmit={() => undefined}
                    static
                  />
                </SheetPanel>
              </div>
            </div>
          </PhoneShot>
          <PhoneShot caption="You" initial="dark" path="/you">
            <YouView
              me={m.me}
              total={77}
              unseen={12}
              archivedCount={9}
              theme="system"
              onTheme={noop}
              websiteUrl="https://lymi.app/"
              static={{ path: "/you" }}
            />
          </PhoneShot>
        </div>
        <Shot caption="Desktop, a deck" initial="dark">
          {(t) => (
            <Desktop theme={t} height={640}>
              <Sidebar
                decks={m.decks}
                name={m.me.name}
                onAdd={noop}
                static={{ path: "/library/d1" }}
              />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <DeckDetailView
                  deck={m.decks[0]}
                  cards={m.deckCards}
                  onAdd={noop}
                  onArchive={noop}
                  static={{ path: "/library/d1" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
      </Sub>

      <Sub
        title="Making a deck, and settling it"
        note="A deck is a name and two settings, so creating one is a sheet rather than a wizard: the name is the field that matters and the rest already has an answer. The sheet takes the shape of the machine it is on: a drawer under the thumb on the phone, a centred modal on a desktop, same panel inside both. Everything chosen there can be changed afterwards on the deck's own settings screen, which is a screen and not a sheet because the back gesture should work and the direction choice needs room to say what it does. Nothing there has a Save button."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="New deck" initial="light" path="/library" bare>
            <div className="flex flex-1 flex-col justify-end bg-scrim">
              <div className="edge-2 rounded-t-xl bg-plate">
                <SheetPanel variant="drawer" title="New deck">
                  <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                </SheetPanel>
              </div>
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
                onAdd={noop}
                static={{ path: "/library" }}
              />
              <main className="@container relative flex min-w-0 flex-1 flex-col">
                <LibraryView decks={m.decks} archivedCount={9} static={{ path: "/library" }} />
                <div className="absolute inset-0 grid place-items-center bg-scrim">
                  <div className="edge-2 w-[min(92%,440px)] rounded-xl bg-plate">
                    <SheetPanel variant="modal" title="New deck">
                      <NewDeckForm onCancel={noop} onSubmit={() => undefined} static />
                    </SheetPanel>
                  </div>
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
      </Sub>

      <Sub
        title="Login"
        note="The front door has one job: sign in. The lantern and plain wordmark sit above one centered task. When an MCP client sent the learner here, its verified identity appears inside that same focused panel."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Sign in" initial="dark" path="/login" bare>
            <LoginView onGoogle={noop} />
          </PhoneShot>
          <PhoneShot caption="Sent here by an app" initial="light" path="/login" bare>
            <LoginView onGoogle={noop} app={CLAUDE} />
          </PhoneShot>
          <PhoneShot caption="Sign-in failed" initial="light" path="/login" bare>
            <LoginView onGoogle={noop} error="Sign-in didn’t go through. Try again." />
          </PhoneShot>
          <PhoneShot caption="Not on the invite list" initial="dark" path="/login" bare>
            <LoginView
              onGoogle={noop}
              blocked
              error="This Google account has not been invited. Request an invitation, or try another account."
            />
          </PhoneShot>
        </div>
      </Sub>

      <Sub
        title="Consent"
        note="The stop between an app's sign-in and its first request. Read is stated, because a connector cannot work without it; write is the only decision, so it is the only control. A recognised host is named; anything else is titled by its address, and its own name is shown as a claim."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="A recognised app" initial="light" path="/consent" bare>
            <ConsentDemo app={CLAUDE} />
          </PhoneShot>
          <PhoneShot caption="An app Lymi does not recognise" initial="dark" path="/consent" bare>
            <ConsentDemo app={UNKNOWN} />
          </PhoneShot>
        </div>
      </Sub>

      <Sub
        title="Connected"
        note="The ending. An MCP client's redirect is usually a custom scheme, so the browser hands off and leaves the tab here; the rail draws across and the lantern lights. This is the only choreography outside review."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Connected, read and write" initial="dark" path="/consent" bare>
            <ConnectedView app={CLAUDE} scopes={{ read: true, write: true }} />
          </PhoneShot>
          <PhoneShot caption="Denied" initial="light" path="/consent" bare>
            <ConnectedView app={CLAUDE} refused />
          </PhoneShot>
        </div>
      </Sub>
    </Section>
  );
}
