import { EASE_OUT } from "@lymi/design";
import { useEffect } from "react";
import { I18nManager, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ALWAYS, curve, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";

const DRAW_MS = 360;

/**
 * The rule over the answer is the wick: a hairline in the edge colour that draws across from the
 * start edge as the answer arrives. Under reduced motion, and on a card shown as it already stands,
 * it is simply there. motion.md "Review".
 */
export function Wick({ still }: { still: boolean }) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const quiet = still || reduce;
  const drawn = useSharedValue(quiet ? 1 : 0);
  useEffect(() => {
    if (quiet) return;
    drawn.value = withTiming(1, {
      duration: DRAW_MS,
      easing: curve(EASE_OUT),
      reduceMotion: ALWAYS,
    });
  }, [quiet, drawn]);
  const style = useAnimatedStyle((): ViewStyle => ({ transform: [{ scaleX: drawn.value }] }));
  return (
    <Animated.View
      className="h-px"
      // It draws from the start edge, which is the right in a right-to-left language.
      style={[
        {
          backgroundColor: p["edge-2"],
          transformOrigin: I18nManager.isRTL ? "100% 50%" : "0% 50%",
        },
        style,
      ]}
    />
  );
}
