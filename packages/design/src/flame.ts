import { daySatisfied, type StreakOut } from "@lymi/core";

export const FLAME_SIZE = { out: 0, start: 0.72, nearly: 1.02, full: 1.16 } as const;

export const FLAME_BREATH = { feed: 1, rise: 1.6 } as const;

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

export function flameSize(progress: number | undefined, out = false): number {
  if (out) return FLAME_SIZE.out;
  if (progress === undefined) return 1;
  if (progress >= 1) return FLAME_SIZE.full;
  const p = Math.max(0, progress) ** 0.75;
  return FLAME_SIZE.start + (FLAME_SIZE.nearly - FLAME_SIZE.start) * p;
}

export interface LanternDay {
  current: StreakOut["current"];
  today: Pick<StreakOut["today"], "attempts" | "goal" | "outcome">;
}

export function todayProgress(today: LanternDay["today"]): number {
  if (daySatisfied(today.outcome)) return 1;
  return today.goal > 0 ? Math.min(today.attempts / today.goal, 1) : 0;
}

export function lanternFor(day: LanternDay | undefined): {
  out: boolean;
  progress: number | undefined;
} {
  if (!day) return { out: false, progress: undefined };
  if (day.current === 0 && day.today.attempts === 0) return { out: true, progress: 0 };
  return { out: false, progress: todayProgress(day.today) };
}

export type StreakFlameState = "out" | "lit" | "full";

export const STREAK_FLAME_SIZE: Record<StreakFlameState, number> = {
  out: FLAME_SIZE.out,
  lit: 1,
  full: FLAME_SIZE.full,
};

export function streakFlameFor(day: LanternDay): StreakFlameState {
  const { out, progress } = lanternFor(day);
  if (out) return "out";
  return progress === 1 ? "full" : "lit";
}
