import { MonthBars } from "../../components/month-bars";
import { RunStrip } from "../../components/run-strip";
import { SevenLights } from "../../components/seven-lights";
import { StatPlate } from "../../components/stat-plate";
import { StateStripe } from "../../components/state-stripe";
import { StreakButton, StreakPanel, StreakWeek } from "../../components/streak";
import { TrendLine } from "../../components/trend-line";
import { Variants } from "../frame";
import {
  history,
  insights,
  streakDaysOpen,
  streakFrom,
  streak as streakSummary,
  thinInsights,
} from "../mock";
import { type Group, noop } from "./types";

const trend = insights.recall.series.map((p) => ({
  at: p.at,
  t: new Date(p.at).getTime(),
  value: p.rate,
  label: `week of ${p.at}`,
}));

export const streak: Group = {
  slug: "streak",
  title: "Streak",
  lede: "The streak's components: the pill, the modal it opens, the week with the run, and the seven lights. What the streak means is on the Streak foundation page.",
  entries: [
    {
      slug: "pill",
      name: "Streak pill",
      source: "components/streak.tsx",
      note: "The run and its flame, always in the chrome: on the rail's first line on desktop and at the start of the top bar on the phone. Its flame's states are on the Flame page.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Goal met",
              note: "Full and flickering. A plate with a 44 px hit area on the phone; ghost until hovered on the rail.",
              render: () => (
                <div className="flex items-center gap-3">
                  <StreakButton variant="phone" summary={streakSummary} />
                  <StreakButton variant="rail" summary={streakSummary} />
                </div>
              ),
            },
            {
              label: "Goal open",
              note: "Lit and still. The run holds until today ends.",
              render: () => (
                <StreakButton
                  variant="phone"
                  summary={streakFrom(streakDaysOpen.map((n) => n * 2))}
                />
              ),
            },
            {
              label: "Nothing due",
              note: "Lit and still: kept, not grown.",
              render: () => (
                <StreakButton
                  variant="phone"
                  summary={{
                    ...streakSummary,
                    today: { ...streakSummary.today, attempts: 0, outcome: "nothing_due" },
                  }}
                />
              ),
            },
            {
              label: "No streak",
              note: "The lantern's ember.",
              render: () => (
                <StreakButton
                  variant="phone"
                  summary={{
                    ...streakSummary,
                    current: 0,
                    days: [],
                    today: { ...streakSummary.today, attempts: 0, outcome: "open" },
                  }}
                />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "modal",
      name: "Streak modal",
      source: "components/streak.tsx",
      note: "Today's attempts against the goal, the longest run, days reviewed and the month. A day that counted is ringed; a faint band joins the days that kept the run. The goal is changed here and nowhere else.",
      Demo: () => (
        <div className="edge-2 max-w-[400px] rounded-xl bg-plate p-5">
          <StreakPanel summary={streakSummary} onGoalChange={noop} />
        </div>
      ),
    },
    {
      slug: "week",
      name: "Week and run",
      source: "components/streak.tsx",
      note: "Today stays open until it ends, so an unfinished morning still shows yesterday's run beside the week.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Goal reached today",
              note: "The last light is full.",
              render: () => <StreakWeek summary={streakSummary} size="lg" />,
            },
            {
              label: "Not yet today",
              note: "The run holds and today's light waits.",
              render: () => (
                <StreakWeek summary={streakFrom(streakDaysOpen.map((n) => n * 2))} size="lg" />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "seven-lights",
      name: "Seven lights",
      source: "components/seven-lights.tsx",
      note: "A day that counted is full. Otherwise the light reaches its middle step at half that day's own goal. The steps mix toward the glass, so “a little” never looks like “nothing” in the dark room.",
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
      source: "components/stat-plate.tsx",
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
      source: "components/trend-line.tsx",
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
      source: "components/run-strip.tsx",
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
      source: "components/month-bars.tsx",
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
      source: "components/state-stripe.tsx",
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
