import { END_OF_REVIEW as AT, type EndEmber } from "@lymi/design";
import type { HapticEvent } from "../../modules/lymi-haptics";

/**
 * The end of a review felt through Core Haptics: a faint tick under each ember as it lifts, and one
 * warm pulse as today's light fills when the day has just turned. phone.md "Haptics".
 */
export function endHaptics(embers: readonly EndEmber[], turned: boolean, reduce: boolean) {
  const ticks: HapticEvent[] = embers.map((e) => ({
    time: (AT.embers + e.at) / 1000,
    intensity: 0.28,
    sharpness: 0.55,
  }));
  const pulse: HapticEvent[] = turned
    ? [{ time: reduce ? 0 : AT.land / 1000, intensity: 0.6, sharpness: 0.12, duration: 0.45 }]
    : [];
  return [...ticks, ...pulse];
}
