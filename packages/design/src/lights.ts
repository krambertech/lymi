export type LightLevel = 0 | 1 | 2 | 3;

export const LIGHT_STEP_MS = 70;

export function lightReference(days: number[]): number {
  return Math.max(...days, 10);
}

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
