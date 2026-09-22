import type { ReactNode } from "react";
import { ActivityView } from "../../views/activity-view";
import { Sidebar } from "../../views/shell";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot, Shot } from "../shot";
import { activity, activityToday } from "./activity.mock";

/** Activity's rows are drawn in place too: the design page never leaves itself. */
const staticRowLink = (_id: unknown, className: string, children: ReactNode) => (
  <span className={className}>{children}</span>
);
const staticCardLink = (_deck: string, _card: string, className: string, children: ReactNode) => (
  <span className={className}>{children}</span>
);

export const screen: Screen = {
  order: 80,
  slug: "activity",
  name: "Activity",
  source: "views/activity-view.tsx",
  note: "What came into the decks from outside the app and what went out of it, newest first under day headings. A row is one sentence that never names the caller, because the line under it does; the mark is the verb. Writes of one kind by one caller in one deck on one day are one row, and a row that wrote cards opens them in place rather than sending the learner away.",
  Demo: () => (
    <div className="grid gap-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 @3xl:grid-cols-2">
        <PhoneShot caption="A week of writes" initial="dark" path="/activity">
          <ActivityView
            entries={activity}
            today={activityToday}
            onRetry={noop}
            importLink={staticRowLink}
            deckLink={staticRowLink}
            cardLink={staticCardLink}
          />
        </PhoneShot>
        <PhoneShot caption="Nothing has come in yet" initial="light" path="/activity">
          <ActivityView
            entries={[]}
            today={activityToday}
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
                entries={activity}
                today={activityToday}
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
};
