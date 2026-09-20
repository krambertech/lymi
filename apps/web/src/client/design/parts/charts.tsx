import { DayGrid } from "../../components/day-grid";
import { RecallTally } from "../../components/recall-tally";
import { RunStrip } from "../../components/run-strip";
import { SevenLights } from "../../components/seven-lights";
import { StatPlate } from "../../components/stat-plate";
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
  short: new Date(p.at).toLocaleDateString("en", { day: "numeric", month: "short" }),
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
      note: "Today's attempts against the goal, the longest run, days reviewed and the month. A day that counted is ringed; a faint band joins the days that kept the run. The goal is changed here and nowhere else. It is a place: centred on a desktop, rising over the whole screen on touch, and in the app its open state is `?streak=true`.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Try it",
              note: "Opens the real place in this machine's shape. On the design page its open state stays local.",
              render: () => <StreakButton variant="phone" summary={streakSummary} />,
            },
            {
              label: "The panel",
              render: () => (
                <div className="edge-2 max-w-[400px] rounded-xl bg-plate p-5">
                  <StreakPanel summary={streakSummary} onGoalChange={noop} />
                </div>
              ),
            },
          ]}
        />
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
              note: "The dashed rule is the 90% the schedule aims for. Every bucket carries a dot, and the end labels name the span and the last bucket's value.",
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
            {
              label: "No points",
              note: "What the zero state draws. The same component, so the reference cannot land somewhere the live chart would never put it.",
              render: () => (
                <TrendLine points={[]} target={0.9} targetLabel="90%" label="" className="w-full" />
              ),
            },
          ]}
        />
      ),
    },
    {
      slug: "recall-tally",
      name: "Recall tally",
      source: "components/recall-tally.tsx",
      note: "Drawn in place of the trend line while there are fewer than three weeks to draw. One mark per graded review, so the sample size the percentage hides is visible. A tally, not a timeline.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "A first week",
              note: "Thirteen marks, one of them forgotten. The count is the point.",
              render: () => <RecallTally passed={12} failed={1} className="w-full" />,
            },
            {
              label: "Past counting",
              note: "Over sixty marks are thinner than the gaps between them, so the tally falls back to shares.",
              render: () => <RecallTally passed={132} failed={9} className="w-full" />,
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
              note: "Five days of history inside the same thirty-day frame, so a first week cannot read as a full month.",
              render: () => <RunStrip days={thinInsights.consistency.days} className="w-full" />,
            },
          ]}
        />
      ),
    },
    {
      slug: "day-grid",
      name: "Day grid",
      source: "components/day-grid.tsx",
      note: "Every day since the first review, a column a week. The one figure that grades a day by how much it held, in three steps against that day's own goal; a ring marks a day that counted without filling. It scrolls sideways and rests at the start of a month.",
      Demo: () => (
        <Variants
          items={[
            {
              label: "Four months in the year",
              note: "Opens on today, inside a year whatever the history holds. Hover a day, or read it, and it says what the day held.",
              render: () => (
                <DayGrid
                  days={insights.activity.days}
                  today={insights.activity.today}
                  firstDay={insights.activity.firstDay ?? insights.activity.today}
                  goal={insights.activity.goal}
                />
              ),
            },
            {
              label: "The first week",
              render: () => (
                <DayGrid
                  days={thinInsights.activity.days}
                  today={thinInsights.activity.today}
                  firstDay={thinInsights.activity.firstDay ?? thinInsights.activity.today}
                  goal={thinInsights.activity.goal}
                />
              ),
            },
          ]}
        />
      ),
    },
  ],
};
