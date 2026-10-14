import { CHIP_RETURN, CHIP_RISE, CHIP_STAGGER } from "@lymi/design";
import type { ReactNode } from "react";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { curveFn, useReduceMotion } from "../theme/motion";

/** Chips past this many wait no longer, so a long row still settles quickly. */
const STAGGERED = 5;
const ease = curveFn(CHIP_RETURN.ease);

/** How long `shown` takes to run from 0 to 1 so every chip's rise fits in it, in seconds. */
export const CHIPS_RETURN = CHIP_RETURN.duration + STAGGERED * CHIP_STAGGER;

/**
 * A chip in a row that hides and returns together: as `shown` runs to 1 it rises into place a little
 * after the chip before it, and as `shown` runs back it sinks. Under Reduce Motion it only fades.
 */
export function ChipIn({
  index,
  shown,
  children,
}: {
  index: number;
  shown: SharedValue<number>;
  children: ReactNode;
}) {
  const reduce = useReduceMotion();
  const style = useAnimatedStyle(() => {
    const start = Math.min(index, STAGGERED) * CHIP_STAGGER;
    const own = (shown.value * CHIPS_RETURN - start) / CHIP_RETURN.duration;
    const v = ease(Math.min(1, Math.max(0, own)));
    if (reduce) return { opacity: v };
    return {
      opacity: v,
      transform: [{ translateY: (1 - v) * CHIP_RISE }, { scale: 0.96 + 0.04 * v }],
    };
  });
  return <Animated.View style={style}>{children}</Animated.View>;
}
