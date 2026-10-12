import { type ReactNode, useEffect, useRef } from "react";
import { I18nManager, StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ALWAYS } from "../theme/motion";

/** How far in from the start edge a swipe has to begin, as iOS's own back swipe. */
const EDGE = 28;
/** Past this share of the width, or on a flick, letting go takes the grade back. */
const LANDS = 0.4;
/** The card under it starts this share of the width toward the start edge and slides home. */
const PARALLAX = 0.3;
const BACK = { duration: 340, dampingRatio: 1, reduceMotion: ALWAYS };

/**
 * A swipe from the start edge takes back the last grade, as going back a page does on iOS: the card on
 * screen follows the finger toward the end edge and the graded one waits under it, revealed. `onUndo`
 * runs once the top card has gone, so the screen swaps to the card already showing.
 */
export function useUndoSwipe({ enabled, onUndo }: { enabled: boolean; onUndo: () => void }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const dir = I18nManager.isRTL ? -1 : 1;
  const gesture = Gesture.Pan()
    .enabled(enabled)
    .hitSlop(I18nManager.isRTL ? { right: 0, width: EDGE } : { left: 0, width: EDGE })
    .activeOffsetX(dir * 10)
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      x.value = Math.min(width, Math.max(0, e.translationX * dir));
    })
    .onEnd((e) => {
      if (x.value > width * LANDS || (e.velocityX * dir > 600 && x.value > 24)) {
        x.value = withTiming(
          width,
          { duration: 200, easing: Easing.out(Easing.quad), reduceMotion: ALWAYS },
          () => scheduleOnRN(onUndo),
        );
      } else {
        x.value = withSpring(0, BACK);
      }
    });
  return { gesture, x, dir };
}

/** The graded card waiting under the one on screen, and the one on screen over it. */
export function UndoStack({
  x,
  dir,
  gesture,
  under,
  turn,
  children,
}: {
  x: SharedValue<number>;
  dir: number;
  gesture: ReturnType<typeof useUndoSwipe>["gesture"];
  /** The last graded card as it will come back, or nothing when there is none. */
  under: ReactNode;
  /** Changes with each grade and undo; the top card returns to its place once the screen has. */
  turn: string | null;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  // The card underneath stays until the top one is back in place, so landing an undo never blinks.
  const kept = useRef<ReactNode>(null);
  if (under) kept.current = under;
  const placed = useRef(turn);
  useEffect(() => {
    if (placed.current === turn) return;
    placed.current = turn;
    x.value = 0;
  }, [turn, x]);
  const top = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * dir }],
    // The edge it leaves by casts a little shade over the card coming back.
    boxShadow:
      x.value > 0
        ? `${-dir * 6}px 0 24px rgba(0, 0, 0, ${interpolate(x.value, [0, width], [0.18, 0])})`
        : "none",
  }));
  const below = useAnimatedStyle(() => ({
    opacity: x.value > 0 ? 1 : 0,
    transform: [{ translateX: -dir * width * PARALLAX * (1 - x.value / width) }],
  }));
  return (
    <GestureDetector gesture={gesture}>
      <View className="flex-1">
        {kept.current && (
          <Animated.View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[StyleSheet.absoluteFill, below]}
          >
            {kept.current}
          </Animated.View>
        )}
        <Animated.View className="flex-1 bg-canvas" style={top}>
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
