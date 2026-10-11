/**
 * The seven lights: the last seven days as the lantern's glass, seen small. Each light shows one
 * of these levels, with `--light-1`, `--light-2` and `--amber` as its colours; streak.md.
 */
export type LightLevel = 0 | 1 | 2 | 3;

/** How far apart the lights switch on in a sequence, in ms. */
export const LIGHT_STEP_MS = 70;

/**
 * The busiest day of the week with a floor under it, which a day without a goal is measured
 * against, so a quiet week is not flattered into looking heavy and one big Tuesday does not wash
 * the rest of the week out.
 */
export function lightReference(days: number[]): number {
  return Math.max(...days, 10);
}

/**
 * A day's light by how much it held. A day that counted toward a streak is full, and one measured
 * against a goal reaches the middle step at half of that day's own goal, so lowering today's goal
 * never rewrites how an earlier day looks.
 */
export function lightLevel(
  n: number,
  reference: number,
  goal?: number | null,
  counted?: boolean,
): LightLevel {
  if (counted) return 3;
  if (n <= 0) return 0;
  if (goal) return n >= goal ? 3 : n >= goal / 2 ? 2 : 1;
  const share = n / reference;
  if (share >= 0.67) return 3;
  if (share >= 0.34) return 2;
  return 1;
}
