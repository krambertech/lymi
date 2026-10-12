import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, type ViewStyle } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import Animated, {
  type AnimatedStyle,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ALWAYS } from "../theme/motion";

/** Past this share of the screen, letting go ends. phone.md "Review". */
const LINE = 1 / 3;
/** The corners the screen takes on as it comes away, toward the iPhone's own. */
const CORNER = 44;
const BACK = { duration: 380, dampingRatio: 1, reduceMotion: ALWAYS };

/**
 * The review's cover follows a finger pulling its top bar down, with Today behind it. Past a third of
 * the screen a selection tick marks the line, and letting go there ends: `away` slides the cover off
 * before `onEnd`, as leaving does; otherwise it springs back as `onEnd` swaps what it shows.
 */
export function usePullToEnd({ onEnd, away }: { onEnd: () => void; away: boolean }) {
  const { height } = useWindowDimensions();
  const y = useSharedValue(0);
  const past = useSharedValue(false);
  const line = height * LINE;
  const tick = () => Haptics.selectionAsync();

  const gesture = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
      const over = y.value > line;
      if (over !== past.value) {
        past.value = over;
        scheduleOnRN(tick);
      }
    })
    .onEnd((e) => {
      // A flick down ends from short of the line too, as iOS's own covers do.
      const ending = past.value || (e.velocityY > 900 && y.value > 40);
      past.value = false;
      if (!ending) {
        y.value = withSpring(0, BACK);
        return;
      }
      if (away) {
        y.value = withTiming(
          height,
          { duration: 220, easing: Easing.out(Easing.quad), reduceMotion: ALWAYS },
          () => scheduleOnRN(onEnd),
        );
        return;
      }
      y.value = withSpring(0, BACK);
      scheduleOnRN(onEnd);
    });

  const style = useAnimatedStyle(
    (): ViewStyle => ({
      transform: [{ translateY: y.value }],
      borderRadius: interpolate(y.value, [0, 120], [0, CORNER], "clamp"),
    }),
  );
  return { gesture, style };
}

/** The cover itself: the room's canvas, moved by `usePullToEnd`. */
export function Cover({
  style,
  children,
}: {
  style: AnimatedStyle<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <Animated.View
      className="bg-canvas"
      style={[StyleSheet.absoluteFill, { overflow: "hidden", borderCurve: "continuous" }, style]}
    >
      {children}
    </Animated.View>
  );
}
