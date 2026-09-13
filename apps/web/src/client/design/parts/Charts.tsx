import { streakLength } from "@lymi/core";
import { Flame } from "../../components/Flame";
import { MonthBars } from "../../components/MonthBars";
import { RunStrip } from "../../components/RunStrip";
import { SevenLights } from "../../components/SevenLights";
import { StateStripe } from "../../components/StateStripe";
import { StatPlate } from "../../components/StatPlate";
import { TrendLine } from "../../components/TrendLine";
import { Variants } from "../Frame";
import { history, insights, streakDays, streakDaysOpen, thinInsights } from "../mock";
import type { Group } from "./types";

const trend = insights.recall.series.map((p) => ({
  at: p.at,
  t: new Date(p.at).getTime(),
  value: p.rate,
  label: `week of ${p.at}`,
}));

export const streak: Group = {
  slug: "streak",
  title: "Streak",
  lede: "The flame counts days in a row and the seven lights say which days. On Today they sit together under the review button, never in a panel of their own.",
  entries: [
    {
      slug: "streak",
      name: "Flame and run",
      source: "components/Flame.tsx",
      note: "Today stays open until it ends, so an unreviewed morning still shows yesterday’s streak.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Reviewed today",
              note: "The flame flickers and the last light is lit.",
              render: () => (
                <div className="grid w-full justify-items-center gap-3.5 py-2">
                  <p className="flex items-center gap-2 text-md font-medium tabular-nums text-text-2">
                    <Flame className="size-7" flicker />
                    {streakLength(streakDays)} days in a row
                  </p>
                  <SevenLights days={streakDays.slice(-7)} size="lg" />
                </div>
              ),
            },
            {
              label: "Not yet today",
              note: "The run holds and today’s light waits.",
              render: () => (
                <div className="grid w-full justify-items-center gap-3.5 py-2">
                  <p className="flex items-center gap-2 text-md font-medium tabular-nums text-text-2">
                    <Flame className="size-7" flicker />
                    {streakLength(streakDaysOpen)} days in a row
                  </p>
                  <SevenLights days={streakDaysOpen.slice(-7)} size="lg" />
                </div>
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "seven-lights",
      name: "Seven lights",
      source: "components/SevenLights.tsx",
      note: "A day’s light takes three steps of amber, from the lantern’s glass to its flame, by how full the day was against the week’s busiest. The steps mix toward the glass, so “a little” never looks like “nothing” in the dark room.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Large",
              note: "On Today, the size worth looking at.",
              render: () => <SevenLights days={history} size="lg" />,
            },
            {
              label: "Small",
              note: "At the end of a session, showing what the day added.",
              render: () => <SevenLights days={history} />,
            },
          ]}
        />
      ),
    },
  ],
};

export const charts: Group = {
  slug: "charts",
  title: "Charts",
  lede: "Insights is the one screen where charts belong. Figures draw in ink at graded opacity, card states keep their own three colours, and a reviewed day is lit glass wherever it appears. None of it is a scoreboard.",
  entries: [
    {
      slug: "stat-plate",
      name: "Stat plate",
      source: "components/StatPlate.tsx",
      note: "A number and one line of plain words. The line is not a caption: 91% says nothing until the plate says the schedule aims for 90.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "With a figure",
              note: "The label, the number, the picture, then the sentence.",
              render: () => (
                <StatPlate
                  label="Consistency"
                  value={insights.consistency.lit}
                  unit="/ 30 days"
                  figure={<RunStrip days={insights.consistency.days} />}
                  note="Longest run 19 days. Unbroken stretches join up."
                  className="w-full"
                />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "trend-line",
      name: "Trend line",
      source: "components/TrendLine.tsx",
      note: "Recall over time, spaced by date so a gap reads as time away. The scale never starts at zero, which would flatten every real change.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Weekly, with a target",
              note: "The dashed rule is the 90% the schedule aims for. The last point is the one the number talks about.",
              render: () => (
                <TrendLine
                  points={trend}
                  target={0.9}
                  targetLabel="90%"
                  label="Recall by week. The schedule aims for 90%."
                  className="w-full"
                />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "run-strip",
      name: "Run strip",
      source: "components/RunStrip.tsx",
      note: "Consecutive lit days join into one capsule, so a run is a length you can see rather than marks you count. A day is lit or unlit, never graded by volume.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Thirty days",
              render: () => <RunStrip days={insights.consistency.days} className="w-full" />,
            },
            {
              label: "The first week",
              note: "Five days of history still fill the strip.",
              render: () => <RunStrip days={thinInsights.consistency.days} className="w-full" />,
            },
          ]}
        />
      ),
    },
    {
      slug: "month-bars",
      name: "Month bars",
      source: "components/MonthBars.tsx",
      note: "One bar per month, filled by the share of days with a review. Whether the habit holds across seasons. Twelve at most.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Five months",
              note: "The current month counts up to today.",
              render: () => <MonthBars months={insights.months} className="w-full" />,
            },
            {
              label: "The first month",
              render: () => <MonthBars months={thinInsights.months} className="w-full" />,
            },
          ]}
        />
      ),
    },
    {
      slug: "state-stripe",
      name: "State stripe",
      source: "components/StateStripe.tsx",
      note: "How a deck’s cards split between new, learning and known, in their state colours, filling left to right as cards move along. The deck’s shape, not its score.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "With the legend",
              note: "The counts in words under the stripe.",
              render: () => <StateStripe known={31} learning={14} total={64} className="w-full" />,
            },
            {
              label: "Without the legend",
              note: "Where a filter right below already names the states.",
              render: () => (
                <StateStripe
                  known={31}
                  learning={14}
                  total={64}
                  legend={false}
                  className="w-full"
                />
              ),
            },
          ]}
        />
      ),
    },
  ],
};
