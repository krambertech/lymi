import { END_OF_REVIEW as AT, type EndEmber } from "@lymi/design";
import type { HapticEvent } from "../../modules/lymi-haptics";

/**
 * The end of a review felt through Core Haptics: a faint tick under each ember as it lifts and, when
 * the day has just turned, the spark's path: a tick as it leaves the flame, a tap as it lands in
 * today's light, and one warm pulse as the run's flame catches. phone.md "Haptics".
 */
export function endHaptics(embers: readonly EndEmber[], turned: boolean, reduce: boolean) {
  const ticks: HapticEvent[] = embers.map((e) => ({
    time: (AT.embers + e.at) / 1000,
    intensity: 0.28,
    sharpness: 0.55,
  }));
  const pulse: HapticEvent = { intensity: 0.6, sharpness: 0.12, duration: 0.45, time: 0 };
  if (!turned) return ticks;
  if (reduce) return [...ticks, pulse];
  return [
    ...ticks,
    { time: AT.spark / 1000, intensity: 0.3, sharpness: 0.6 },
    { time: AT.land / 1000, intensity: 0.5, sharpness: 0.4 },
    { ...pulse, time: AT.tick / 1000 },
  ];
}
