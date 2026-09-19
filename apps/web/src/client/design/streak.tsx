import { StreakButton, type StreakSummary, StreakWeek } from "../components/streak";
import { DocLink } from "./doc-link";
import { Doc, Sub, Variants } from "./frame";
import { streakDaysOpen, streakFrom, streak as streakSummary } from "./mock";

const link =
  "font-medium text-text underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-current";

const PARTS: [string, string][] = [
  [
    "The number",
    "How many days in a row met their goal. Plain, in tabular figures, and secondary to whatever the screen is for.",
  ],
  [
    "Today's goal",
    "How far today has come: accepted reviews against the number the learner chose. Changed only in the streak modal.",
  ],
  [
    "The seven lights",
    "Which days, where the number says how many. A day that counted is full; otherwise the light reaches its middle step at half that day's goal.",
  ],
  [
    "The pill",
    "The run, always in the chrome: on the rail's first line on desktop, at the start of the top bar on the phone. It opens the modal.",
  ],
  [
    "The modal",
    "The run with one plain line about today, today's attempts against the goal, the longest streak, the days reviewed and the month. The only place the goal changes.",
  ],
];

const RULES = [
  "A day counts when its goal is met, or when every available review is done below it.",
  "Every accepted grade counts once, Forgot included. The goal counts attempts, not correct answers.",
  "Today is open until it ends, so an unfinished morning shows yesterday's streak, not zero.",
  "A confirmed nothing-due day keeps the streak without adding to it. Not opening Lymi still misses the day.",
  "A day that ends short of its goal puts the streak back to zero. The review history stays.",
];

const open = streakFrom(streakDaysOpen.map((n) => n * 2));
/** Today satisfied by running out of reviews below the goal: the second way a day counts. */
const exhausted: StreakSummary = {
  ...open,
  current: open.current + 1,
  today: { ...open.today, attempts: 3, outcome: "exhausted" },
  days: [
    ...open.days.filter((d) => d.date !== open.today.date),
    {
      date: open.today.date,
      attempts: 3,
      goal: open.today.goal,
      satisfied: true,
      outcome: "exhausted",
    },
  ],
};
const none = {
  ...streakSummary,
  current: 0,
  days: [],
  today: { ...streakSummary.today, attempts: 0, outcome: "open" as const },
};

export function StreakPage() {
  return (
    <Doc
      title="Streak"
      lede="The streak is how many days in a row the learner met their daily goal. It is the length of a habit, not a score: it never grows faster for better answers, never shouts, and never asks to be protected."
    >
      <Sub
        title="What each part says"
        note="Every part answers a different question about the same streak, so no two of them repeat each other."
      >
        <div className="edge overflow-hidden rounded-lg bg-plate">
          {PARTS.map(([name, what]) => (
            <div
              key={name}
              className="grid gap-1 border-b border-edge px-5 py-3 last:border-b-0 @3xl:grid-cols-[160px_1fr] @3xl:gap-4"
            >
              <span className="text-base font-medium">{name}</span>
              <span className="text-sm text-text-2">{what}</span>
            </div>
          ))}
        </div>
        <p className="text-base text-text-2">
          The pill and the modal carry the flame, which says how far today has come; the number says
          whether the streak is alive. Its states are on{" "}
          <DocLink to={{ kind: "page", page: "flame" }} className={link}>
            Flame
          </DocLink>
          . The components are under{" "}
          <DocLink to={{ kind: "group", group: "streak" }} className={link}>
            Components
          </DocLink>
          .
        </p>
      </Sub>

      <Sub
        title="How a day counts"
        note="The rules the server applies. The screens only show the result."
      >
        <ul className="grid gap-2 text-base text-text-2">
          {RULES.map((r) => (
            <li key={r} className="edge rounded-md bg-plate px-4 py-3">
              {r}
            </li>
          ))}
        </ul>
      </Sub>

      <Sub
        title="Together"
        note="The pill and the week read the same summary, so they cannot tell two stories."
      >
        <Variants
          items={[
            {
              label: "Goal met today",
              note: "The run includes today and today's light is full.",
              render: () => (
                <div className="flex flex-wrap items-center gap-8">
                  <StreakButton variant="phone" summary={streakSummary} />
                  <StreakWeek summary={streakSummary} size="lg" />
                </div>
              ),
            },
            {
              label: "Today still open",
              note: "Yesterday's run holds and today's light waits.",
              render: () => (
                <div className="flex flex-wrap items-center gap-8">
                  <StreakButton variant="phone" summary={open} />
                  <StreakWeek summary={open} size="lg" />
                </div>
              ),
            },
            {
              label: "You’re done for today",
              note: "Every available review done below the goal. It counts, and the modal says why.",
              render: () => (
                <div className="flex flex-wrap items-center gap-8">
                  <StreakButton variant="phone" summary={exhausted} />
                  <StreakWeek summary={exhausted} size="lg" />
                </div>
              ),
            },
            {
              label: "No streak",
              note: "Zero, said plainly. Reviews today still count toward starting one.",
              render: () => (
                <div className="flex flex-wrap items-center gap-8">
                  <StreakButton variant="phone" summary={none} />
                  <StreakWeek summary={none} size="lg" />
                </div>
              ),
            },
          ]}
        />
      </Sub>

      <Sub title="Don’t">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Don’t make the number the largest thing on the screen.",
            "Don’t celebrate the goal. No confetti, no badge, no toast.",
            "Don’t nag. No reminder that a streak is about to break.",
            "Don’t reward a grade. Forgot counts exactly as Easy does.",
            "Don’t draw it as a progress ring or a percentage.",
            "Don’t add a second place to change the daily goal.",
          ].map((t) => (
            <li key={t} className="edge rounded-md bg-plate px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      </Sub>
    </Doc>
  );
}
