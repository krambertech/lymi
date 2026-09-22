import { ShellChrome } from "../../components/layout/shell-chrome";
import { StreakButton } from "../../components/streak";
import { Sidebar } from "../../views/shell";
import { TodayView } from "../../views/today-view";
import { designChrome } from "../chrome";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot, Shot } from "../shot";
import { noHistory, quietDecks, rounds } from "./today.mock";

export const screen: Screen = {
  order: 10,
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
            rounds={rounds}
            static={{ path: "/today" }}
          />
        </PhoneShot>
        <PhoneShot caption="A series due" initial="light" path="/today">
          <TodayView
            decks={m.decksInSeries}
            series={m.series}
            streak={m.streak}
            streakCard={<StreakButton variant="card" summary={m.streak} />}
            rounds={rounds}
            static={{ path: "/today" }}
          />
        </PhoneShot>
        <PhoneShot caption="Nothing due" initial="light" path="/today">
          <ShellChrome
            value={designChrome("/today", m.streakFrom(m.streakDaysOpen.map((n) => n * 2)))}
          >
            <TodayView
              decks={quietDecks}
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
            streak={m.streakFrom(noHistory)}
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
                rounds={rounds}
                static={{ path: "/today" }}
              />
            </main>
          </Desktop>
        )}
      </Shot>
    </div>
  ),
};
