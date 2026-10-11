import type { Curve, Spring } from "@lymi/design";
import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";
import { Easing, FadeIn, ReduceMotion } from "react-native-reanimated";

/** A shared spring as Reanimated takes it; its duration is perceptual, as Motion's visualDuration is. */
export function spring(s: Spring) {
  const seconds = "visualDuration" in s ? s.visualDuration : s.duration;
  return { duration: seconds * 1000, dampingRatio: 1 - s.bounce, reduceMotion: ReduceMotion.Never };
}

/** A shared curve as a Reanimated easing. */
export function curve([x1, y1, x2, y2]: Curve) {
  return Easing.bezier(x1, y1, x2, y2);
}

/** A shared curve as a plain function, for a worklet that eases its own clock. */
export function curveFn([x1, y1, x2, y2]: Curve) {
  return Easing.bezierFn(x1, y1, x2, y2);
}

/**
 * Where an unbouncing spring stands `ms` into its run, 0 to 1, as Motion solves one with this
 * visual duration. A clock can then drive it, and finishing the clock finishes the spring.
 */
export function springAt(ms: number, s: Spring) {
  "worklet";
  if (ms <= 0) return 0;
  const seconds = "visualDuration" in s ? s.visualDuration : s.duration;
  const w = (2 * Math.PI) / (seconds * 1.2);
  const t = ms / 1000;
  return 1 - (1 + w * t) * Math.exp(-w * t);
}

let reduceMotion = false;
const listeners = new Set<() => void>();
const setReduceMotion = (on: boolean) => {
  reduceMotion = on;
  for (const l of listeners) l();
};
AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * Whether Reduce Motion is on, following the setting while the app runs. Reanimated's own hook reads
 * it once at launch, and its animations skip by that stale value, so every animation here takes
 * `ReduceMotion.Never` and the screen chooses the full or the reduced version itself.
 */
export function useReduceMotion() {
  return useSyncExternalStore(subscribe, () => reduceMotion);
}

/** For a timing: the screen has already chosen between the full and the reduced version. */
export const ALWAYS = ReduceMotion.Never;

/** The reduced version of an arrival: a crossfade with no travel, which still runs under Reduce Motion. */
export const CROSSFADE = FadeIn.duration(200).reduceMotion(ALWAYS);
