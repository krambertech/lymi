import type { Curve, Spring } from "@lymi/design";
import { Easing } from "react-native-reanimated";

/** A shared spring as Reanimated takes it; its duration is perceptual, as Motion's visualDuration is. */
export function spring(s: Spring) {
  const seconds = "visualDuration" in s ? s.visualDuration : s.duration;
  return { duration: seconds * 1000, dampingRatio: 1 - s.bounce };
}

/** A shared curve as a Reanimated easing. */
export function curve([x1, y1, x2, y2]: Curve) {
  return Easing.bezier(x1, y1, x2, y2);
}
