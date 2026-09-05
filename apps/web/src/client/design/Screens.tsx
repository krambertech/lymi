import type { ReactNode } from "react";
import { useState } from "react";
import { AddCardForm } from "../components/AddCardSheet";
import { Button } from "../components/Button";
import { DeckDetailView } from "../views/DeckDetailView";
import { DecksView } from "../views/DecksView";
import { LoginView } from "../views/LoginView";
import { GradeBar, ReviewCard, ReviewHeader, SessionDone } from "../views/ReviewView";
import { SettingsView } from "../views/SettingsView";
import { Sidebar, TabBar } from "../views/Shell";
import { TodayView } from "../views/TodayView";
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
  due = 11,
  children,
  bare,
}: {
  caption: ReactNode;
  initial: FrameTheme;
  path: string;
  due?: number | undefined;
  children: ReactNode;
  bare?: boolean | undefined;
}) {
  return (
    <Shot caption={caption} initial={initial}>
      {(t) => (
        <Phone
          theme={t}
          bottom={bare ? undefined : <TabBar totalDue={due} onAdd={noop} static={{ path }} />}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </Phone>
      )}
    </Shot>
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
    <div className="flex flex-1 flex-col px-4 pb-3">
      <ReviewHeader done={4} total={11} deckName="Lesson 14" />
      <ReviewCard
        item={item}
        revealed={revealed}
        onReveal={() => setRevealed(true)}
        onPlayAudio={noop}
        className="mt-5"
      />
      <GradeBar
        item={item}
        enabled={revealed}
        onGrade={() => setRevealed(false)}
        className="mt-3"
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
        note="The lantern is lit and glowing when cards are due, dark when they are not. Seven lights for the week. Decks follow as rows."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Cards due" initial="dark" path="/">
            <TodayView decks={m.decks} history={m.history} static={{ path: "/" }} />
          </PhoneShot>
          <PhoneShot caption="Nothing due" initial="light" path="/" due={0}>
            <TodayView
              decks={m.quietDecks}
              history={m.historyNothingToday}
              static={{ path: "/" }}
            />
          </PhoneShot>
          <PhoneShot caption="First run" initial="light" path="/" due={0}>
            <TodayView decks={[]} history={[0, 0, 0, 0, 0, 0, 0]} static={{ path: "/" }} />
          </PhoneShot>
        </div>
      </Sub>

      <Sub
        title="Review"
        note="The word alone, then the meaning under a rule. Good is the only amber. Tap the card in the frame to reveal; grading resets it."
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
        title="End of session"
        note="The lantern lights up and stays. Cards counted, not points. The week’s lights show what the day added."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="That’s the lot" initial="dark" path="/review" bare>
            <div className="flex flex-1 flex-col px-4">
              <ReviewHeader done={11} total={11} deckName="Lesson 14" />
              <SessionDone
                done={11}
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
                <Sidebar decks={m.decks} totalDue={11} onAdd={noop} static={{ path: "/" }} />
                <main className="@container flex min-w-0 flex-1 flex-col">
                  <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-8 pt-4">
                    <ReviewHeader done={4} total={11} deckName="Lesson 14" />
                    <ReviewCard
                      item={m.queueItem}
                      revealed
                      onReveal={noop}
                      onPlayAudio={noop}
                      className="mt-5 min-h-[400px] flex-none"
                    />
                    <GradeBar item={m.queueItem} enabled onGrade={noop} className="mt-3" />
                  </div>
                </main>
              </Desktop>
            )}
          </Shot>
        </div>
      </Sub>

      <Sub
        title="Decks and capture"
        note="Decks are rows. A deck is a table with search. Capture is a sheet with one field that matters."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2 @5xl:grid-cols-3">
          <PhoneShot caption="Decks" initial="light" path="/decks">
            <DecksView decks={m.decks} static={{ path: "/decks" }} />
          </PhoneShot>
          <PhoneShot caption="Add a word" initial="dark" path="/decks" bare>
            <div className="flex flex-1 flex-col justify-end bg-scrim">
              <div className="edge-2 rounded-t-xl bg-plate">
                <AddCardForm decks={m.decks} deckId="d1" onCancel={noop} onSubmit={noop} static />
              </div>
            </div>
          </PhoneShot>
          <PhoneShot caption="Settings" initial="dark" path="/settings" due={0}>
            <SettingsView me={m.me} theme="system" onTheme={noop} />
          </PhoneShot>
        </div>
        <Shot caption="Desktop, a deck" initial="dark">
          {(t) => (
            <Desktop theme={t} height={640}>
              <Sidebar decks={m.decks} totalDue={11} onAdd={noop} static={{ path: "/decks/d1" }} />
              <main className="@container flex min-w-0 flex-1 flex-col">
                <DeckDetailView
                  deck={m.decks[0]}
                  cards={m.deckCards}
                  onAdd={noop}
                  onArchive={noop}
                  static={{ path: "/decks/d1" }}
                />
              </main>
            </Desktop>
          )}
        </Shot>
      </Sub>

      <Sub
        title="Login"
        note="The front door. The lantern is already lit and the wordmark carries the flame: you are expected."
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
          <PhoneShot caption="Sign in" initial="dark" path="/login" bare>
            <LoginView onGoogle={noop} />
          </PhoneShot>
        </div>
      </Sub>
    </Section>
  );
}
