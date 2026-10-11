import type { StreakOut } from "@lymi/core";

/**
 * How tall the flame stands. 0 is out and 1 is the brand flame. Growth before the goal stops
 * short of full, so reaching the goal is a rise of its own rather than one more step.
 */
export const FLAME_SIZE = { out: 0, start: 0.72, nearly: 1.02, full: 1.16 } as const;

/** How deep a breath goes: one review, and the goal. */
export const FLAME_BREATH = { feed: 1, rise: 1.6 } as const;

/**
 * The embers a grade throws up out of the hood: where each drifts to in the lantern's 120 unit
 * box, how long after the grade it leaves in ms, and its size in px, which holds at any lantern
 * size. Grades take the sets in turn, so a run of them never repeats one picture.
 */
export const FLAME_SPARKS = [
  [
    { x: -12, y: -34, at: 0, px: 3.5 },
    { x: 9, y: -42, at: 70, px: 3 },
  ],
  [
    { x: 6, y: -38, at: 0, px: 3.5 },
    { x: -15, y: -28, at: 50, px: 3 },
    { x: 17, y: -24, at: 120, px: 2.5 },
  ],
  [
    { x: -3, y: -44, at: 0, px: 3.5 },
    { x: 14, y: -31, at: 80, px: 3 },
  ],
] as const;

/** Where the flame stands for a day's progress. Undefined progress is the brand flame. */
export function flameSize(progress: number | undefined, out = false): number {
  if (out) return FLAME_SIZE.out;
  if (progress === undefined) return 1;
  if (progress >= 1) return FLAME_SIZE.full;
  // Eased, so the first reviews of a day show a little more than the last ones before the goal.
  const p = Math.max(0, progress) ** 0.75;
  return FLAME_SIZE.start + (FLAME_SIZE.nearly - FLAME_SIZE.start) * p;
}

/** What the flame reads of a day; the phone builds it from its own store. */
export interface LanternDay {
  current: StreakOut["current"];
  today: Pick<StreakOut["today"], "attempts" | "goal" | "outcome">;
}

/** Today's progress toward the goal, 0 to 1. A day that met its goal or ran out of cards is full. */
export function todayProgress(today: LanternDay["today"]): number {
  if (today.outcome === "goal_met" || today.outcome === "exhausted") return 1;
  return today.goal > 0 ? Math.min(today.attempts / today.goal, 1) : 0;
}

/**
 * What the lantern shows for a day. The flame is out only with no streak and no review yet
 * today, so the first review lights it; from there today's attempts grow it to full at the goal.
 */
export function lanternFor(day: LanternDay | undefined): {
  out: boolean;
  progress: number | undefined;
} {
  if (!day) return { out: false, progress: undefined };
  if (day.current === 0 && day.today.attempts === 0) return { out: true, progress: 0 };
  return { out: false, progress: todayProgress(day.today) };
}

export type StreakFlameState = "out" | "lit" | "full";

/** The streak flame's size in each state: the brand flame while lit, the lantern's full once met. */
export const STREAK_FLAME_SIZE: Record<StreakFlameState, number> = {
  out: FLAME_SIZE.out,
  lit: 1,
  full: FLAME_SIZE.full,
};

/**
 * What the pill and the streak modal show. Read from `lanternFor`, so the small flame is out,
 * lit or full exactly when the lantern is; it only leaves out the growth between reviews.
 */
export function streakFlameFor(day: LanternDay): StreakFlameState {
  const { out, progress } = lanternFor(day);
  if (out) return "out";
  return progress === 1 ? "full" : "lit";
}
