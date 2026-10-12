import type { StreakOut } from "@lymi/core";
import { lightLevel, lightReference } from "@lymi/design";

/** What the widgets show for one day. */
export interface Snapshot {
  due: number;
  streak: number;
  reviewed: number;
  goal: number;
  left: number;
  out: boolean;
  signedIn: boolean;
  /** Each day's step of the seven lights, oldest first. */
  week: number[];
}

/**
 * The widgets as the learner's next day opens, sent ahead because a widget cannot fetch: nothing
 * reviewed, the week moved on a day, and the streak with this device's grades in it. What is due
 * is what is due now, since a card left today is still due tomorrow; cards that first fall due
 * tomorrow show once the app opens. `summary` is today's streak with the device's grades.
 */
export function nextDay(
  now: Snapshot,
  summary: StreakOut,
  /** Today's attempts per day, oldest first, as the week counts them. */
  days: readonly number[],
  end: Date,
): { at: Date; snapshot: Snapshot } | undefined {
  if (!(end.getTime() > Date.now())) return undefined;
  const goal = summary.goal;
  const week = [...days.slice(1), 0];
  const reference = lightReference(week);
  return {
    at: end,
    snapshot: {
      due: now.due,
      // The run as it stands tonight carries over; only the server knows a rest day.
      streak: summary.current,
      reviewed: 0,
      goal,
      left: goal,
      // As `lanternFor`: out with no run and no review yet, which is every new day's start.
      out: summary.current === 0,
      signedIn: true,
      week: week.map((n) => lightLevel(n, reference, goal, false)),
    },
  };
}
