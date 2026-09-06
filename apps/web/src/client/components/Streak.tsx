import { bestStreak, daysReviewed, streakLength } from "@lymi/core";
import { clsx } from "clsx";
import { Flame } from "./Flame";
import { SevenLights } from "./SevenLights";
import { Skeleton } from "./Skeleton";

/**
 * Review counts per day, oldest first, today last. Ninety days on Today so the streak is
 * real; the seven lights read the tail of the same array.
 */
export interface StreakProps {
  days: number[] | undefined;
  className?: string | undefined;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The phone treatment: flame and the day count in the Today header, nothing else. The lights
 * do not follow it, because the header has no room and the hero owns the screen.
 */
export function StreakPill({ days, className }: StreakProps) {
  if (!days) return <Skeleton className={clsx("h-[34px] w-16 rounded-full", className)} />;
  const run = streakLength(days);
  return (
    <span
      className={clsx(
        "edge inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full bg-plate pl-2 pr-3 text-base font-semibold tabular-nums text-text",
        className,
      )}
      role="img"
      aria-label={run === 0 ? "No streak yet" : `${plural(run, "day", "days")} in a row`}
    >
      <Flame className="size-5" flicker={run > 0} />
      {run}
    </span>
  );
}

/**
 * The desktop treatment: its own plate beside the hero, with the best run, the lights and
 * one line of prose. Desktop has the width, so the streak gets read rather than glanced at.
 */
export function StreakPlate({ days, className }: StreakProps) {
  if (!days) return <Skeleton className={clsx("h-[188px] rounded-xl @3xl:h-[172px]", className)} />;
  const run = streakLength(days);
  const best = bestStreak(days);
  const week = daysReviewed(days);
  return (
    <section
      className={clsx("edge flex flex-col gap-3.5 rounded-xl bg-plate p-5", className)}
      aria-label="Streak"
    >
      <div className="flex items-center gap-2.5">
        <Flame className="size-7" flicker={run > 0} />
        <div className="grid">
          <span className="text-2xl font-medium leading-tight tabular-nums">
            {run === 0 ? "No streak" : plural(run, "day", "days")}
          </span>
          <span className="text-sm text-muted tabular-nums">
            {run === 0 ? "Review today to start one" : `in a row · best ${best}`}
          </span>
        </div>
      </div>
      <SevenLights days={days.slice(-7)} />
      <p className="text-sm text-muted tabular-nums">Reviewed {week} of the last 7 days.</p>
    </section>
  );
}
