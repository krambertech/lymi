import type { ReviewDayOutcome } from "./responses/review";

/** How many of the last `n` days had a review. Reads under the seven lights. */
export function daysReviewed(days: number[], n = 7): number {
  return days.slice(-n).filter((c) => c > 0).length;
}

const shiftDay = (date: string, by: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + by)).toISOString().slice(0, 10);
};
const nextDay = (date: string) => shiftDay(date, 1);

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

/** A day that counts for the run: its goal was met, or every eligible review was done below it. */
export const daySatisfied = (outcome: ReviewDayOutcome | null | undefined) =>
  outcome === "goal_met" || outcome === "exhausted";

/** What just happened to a day: a grade, an undo, a new goal, a replayed grade, or a visit. */
export type DayChange = "grade" | "undo" | "goal" | "check" | "visit";

/** What a day's outcome is decided from, read together so the write can check none moved. */
export interface DayFacts {
  outcome: ReviewDayOutcome;
  goal: number;
  /** Accepted attempts: reviews less the ones taken back. */
  attempts: number;
  /** Whether a visit already confirmed the day as nothing due. */
  zeroDueConfirmed: boolean;
  /** The day is today and nothing eligible is left to review. */
  nothingLeft: boolean;
}

/**
 * Where a day stands after a change. Attempts reaching the goal meet it; attempts with nothing left
 * exhaust it; a visit to a day with no attempts and nothing left confirms it as nothing due. Only
 * Undo reopens a day, back to nothing due when a visit confirmed that first. A confirmed day keeps
 * protecting the streak when cards added later are graded below the goal.
 */
export function nextOutcome(day: DayFacts, change: DayChange): ReviewDayOutcome {
  if (day.attempts >= day.goal) return "goal_met";
  if (day.nothingLeft && day.attempts > 0) return "exhausted";
  if (change === "visit" && day.nothingLeft && day.attempts === 0 && day.outcome === "open") {
    return "nothing_due";
  }
  if (change === "undo") return day.zeroDueConfirmed ? "nothing_due" : "open";
  return day.outcome;
}

/** A day the run survives: it counted, or a confirmed nothing-due day protected it. */
export const keepsRun = (day: Pick<StreakDay, "satisfied" | "outcome"> | undefined) =>
  !!day && (day.satisfied || day.outcome === "nothing_due");

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
  const restDays: string[] = [];

  let run = 0;
  let longest = 0;
  let lastRest: string | undefined;
  // Today is open until it ends, so the walk stops before it and adds it only once satisfied.
  for (let date = days[0]?.date ?? today; date < today; date = nextDay(date)) {
    const d = byDate.get(date);
    if (keepsRun(d)) {
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

/** The days the current run is drawn across, today's included once it counts. */
export function runDates(
  days: StreakDay[],
  restDays: string[],
  today: { date: string; outcome: ReviewDayOutcome | null },
): Set<string> {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const rest = new Set(restDays);
  const dates = new Set<string>();
  let day = daySatisfied(today.outcome) ? today.date : shiftDay(today.date, -1);
  for (; rest.has(day) || keepsRun(byDate.get(day)); day = shiftDay(day, -1)) {
    if (byDate.get(day)?.satisfied || rest.has(day)) dates.add(day);
  }
  return dates;
}
