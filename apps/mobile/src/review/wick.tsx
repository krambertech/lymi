import { WICK } from "@lymi/design";
import { useEffect } from "react";
import { I18nManager, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { ALWAYS, curve, useReduceMotion } from "../theme/motion";
import { clear, usePalette } from "../theme/palette";

const DRAW_MS = WICK.draw.duration * 1000;

/**
 * The rule over the answer is the wick: it draws across from the start edge as a line of the
 * lantern's light, amber with its glow, then cools to the edge colour. Under reduced motion, and on a
 * card shown as it already stands, it is a hairline. motion.md "Review".
 */
export function Wick({ still }: { still: boolean }) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const quiet = still || reduce;
  const drawn = useSharedValue(quiet ? 1 : 0);
  const cooled = useSharedValue(quiet ? 1 : 0);
  useEffect(() => {
    if (quiet) return;
    drawn.value = withTiming(1, {
      duration: DRAW_MS,
      easing: curve(WICK.draw.ease),
      reduceMotion: ALWAYS,
    });
    cooled.value = withDelay(
      WICK.cool.delay * 1000,
      withTiming(1, {
        duration: WICK.cool.duration * 1000,
        easing: curve(WICK.cool.ease),
        reduceMotion: ALWAYS,
      }),
    );
  }, [quiet, drawn, cooled]);
  const amber = p.amber;
  const gone = clear(amber);
  const edge = p["edge-2"];
  const style = useAnimatedStyle(
    (): ViewStyle => ({
      transform: [{ scaleX: drawn.value }],
      backgroundColor: interpolateColor(cooled.value, [0, 1], [amber, edge]),
      boxShadow: `0 0 6px ${interpolateColor(cooled.value, [0, 1], [amber, gone])}`,
    }),
  );
  return (
    <Animated.View
      className="h-px"
      // It draws from the start edge, which is the right in a right-to-left language.
      style={[{ transformOrigin: I18nManager.isRTL ? "100% 50%" : "0% 50%" }, style]}
    />
  );
}
