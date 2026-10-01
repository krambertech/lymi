import { Plural } from "@lingui/react/macro";
import type { StreakOut } from "@lymi/core";
import { clsx } from "clsx";
import { SevenLights } from "./seven-lights";
import { addDays } from "./streak-calendar";

type StreakSummary = StreakOut;

/**
 * The last `n` local days, oldest first, today last: attempts and whether each counted toward a
 * streak. What the seven lights read.
 */
export function lastDays(summary: StreakSummary, n = 7) {
  const byDate = new Map(summary.days.map((d) => [d.date, d]));
  const rest = new Set(summary.restDays);
  const dates = Array.from({ length: n }, (_, i) => addDays(summary.today.date, i - (n - 1)));
  const days = dates.map((date) => byDate.get(date));
  return {
    dates,
    attempts: days.map((d) => d?.attempts ?? 0),
    satisfied: days.map((d) => d?.satisfied ?? false),
    rest: dates.map((date) => rest.has(date)),
    goals: days.map((d, i) => (i === n - 1 ? summary.today.goal : (d?.goal ?? null))),
  };
}

/**
 * The week and the run together, for Today and the end of a review: the lights say which days,
 * the number beside them says how many in a row. Secondary to whatever is above it, never the
 * largest number on the screen.
 */
export function StreakWeek({
  summary,
  size = "sm",
  className,
}: {
  summary: StreakSummary;
  size?: "sm" | "lg" | undefined;
  className?: string | undefined;
}) {
  const week = lastDays(summary);
  const large = size === "lg";
  return (
    <div
      className={clsx(
        // Stacked where the week fills the width; beside it, behind a rule, where there is room.
        "flex flex-col items-center gap-3 @md:flex-row",
        large ? "@md:gap-5" : "@md:gap-4",
        className,
      )}
    >
      <SevenLights
        days={week.attempts}
        satisfied={week.satisfied}
        rest={week.rest}
        goals={week.goals}
        dates={week.dates}
        size={size}
      />
      <p className="flex shrink-0 items-baseline gap-1.5 @md:grid @md:gap-0 @md:border-s @md:border-edge @md:ps-4 @md:text-start">
        <span
          className={clsx(
            "font-semibold leading-none tabular-nums text-text",
            large ? "text-lg @md:text-2xl" : "text-lg",
          )}
        >
          {summary.current}
        </span>
        <span className="whitespace-nowrap text-sm text-muted @md:mt-1 @md:text-xs">
          <Plural value={summary.current} one="day in a row" other="days in a row" />
        </span>
      </p>
    </div>
  );
}
