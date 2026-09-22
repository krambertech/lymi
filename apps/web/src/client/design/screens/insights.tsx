import { InsightsView } from "../../views/insights-view";
import { Sidebar } from "../../views/shell";
import { Desktop } from "../frame";
import * as m from "../mock";
import { noop, type Screen } from "../parts/types";
import { PhoneShot, Shot } from "../shot";

export const screen: Screen = {
  order: 20,
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
};
