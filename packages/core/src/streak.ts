import type { ReviewDayOutcome } from "./responses/review";

/**
 * The streak, derived from review counts per day. The array is one count per day, oldest
 * first, today last, as `GET /api/review/history` returns it.
 *
 * Today counts once it has a review and is otherwise skipped, so an unreviewed morning shows
 * yesterday's streak instead of zero. A day is broken only after it ends.
 */
export function streakLength(days: number[]): number {
  let i = days.length - 1;
  if (days[i] === 0) i -= 1; // today is still open
  let run = 0;
  for (; i >= 0 && (days[i] ?? 0) > 0; i -= 1) run += 1;
  return run;
}

/** The longest run of reviewed days anywhere in the window. */
export function bestStreak(days: number[]): number {
  let best = 0;
  let run = 0;
  for (const n of days) {
    run = n > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** How many of the last `n` days had a review. Reads under the seven lights. */
export function daysReviewed(days: number[], n = 7): number {
  return days.slice(-n).filter((c) => c > 0).length;
}

const nextDay = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + 1)).toISOString().slice(0, 10);
};

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** A day on the streak calendar. */
export interface StreakDay {
  date: string;
  attempts: number;
  /** The goal the day was measured against. Null for a day from before goals. */
  goal: number | null;
  satisfied: boolean;
  /** How the day ended, so met and exhausted stay apart. Null for a day from before goals. */
  outcome: ReviewDayOutcome | null;
}

/** A rest day is allowed once the run has gone this many days without one. */
const REST_EVERY = 7;

/**
 * The current run, the longest, and the rest days. Today adds once satisfied and is otherwise
 * skipped, so an unfinished morning shows yesterday's run; a nothing-due day keeps a run without
 * adding to it. A past day that falls short, with reviews or none, is a rest day when the run
 * before it is live and has had no other rest day in the six days before it; a rest day keeps the
 * run without adding, and any other short day breaks it. Rest is derived on every read, never
 * stored, so the rule reaches all history.
 */
export function summariseStreak(days: StreakDay[], today: string) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const keeps = (d: StreakDay | undefined) => !!d && (d.satisfied || d.outcome === "nothing_due");
  const restDays: string[] = [];

  let run = 0;
  let longest = 0;
  let lastRest: string | undefined;
  // Today is open until it ends, so the walk stops before it and adds it only once satisfied.
  for (let date = days[0]?.date ?? today; date < today; date = nextDay(date)) {
    const d = byDate.get(date);
    if (keeps(d)) {
      if (d?.satisfied) run++;
    } else if (run > 0 && (!lastRest || daysBetween(lastRest, date) >= REST_EVERY)) {
      restDays.push(date);
      lastRest = date;
    } else {
      run = 0;
      lastRest = undefined;
    }
    if (run > longest) longest = run;
  }
  if (byDate.get(today)?.satisfied) run++;
  if (run > longest) longest = run;

  return {
    current: run,
    longest,
    reviewedDays: days.filter((d) => d.attempts > 0).length,
    restDays,
  };
}
