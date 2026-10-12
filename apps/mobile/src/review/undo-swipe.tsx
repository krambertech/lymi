import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { I18nManager, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type AnimatedStyle,
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ALWAYS, CROSSFADE, useReduceMotion } from "../theme/motion";

/** How far in from the start edge a swipe has to begin, as iOS's own back swipe. */
const EDGE = 28;
/** Past this share of the width, or on a flick, letting go takes the grade back. */
const LANDS = 0.4;
const BACK = { duration: 340, dampingRatio: 1, reduceMotion: ALWAYS };
/** How far a card turns while it is off its place, in degrees. */
const TILT = 6;
/** A new card's arrival over the one just graded: quick, and slowing as it lands. */
const ARRIVE_MS = 320;
const ARRIVE_EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** A swipe from the start edge takes back the last grade. `onUndo` runs once the card has landed. */
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
  // Shows the graded step under a new card while it slides in; set before the new card mounts.
  const arriving = useSharedValue(0);
  const arrive = () => {
    arriving.value = 1;
    arriving.value = withDelay(
      ARRIVE_MS + 60,
      withTiming(0, { duration: 0, reduceMotion: ALWAYS }),
    );
  };
  return { gesture, x, dir, arriving, arrive };
}

/** Where the swipe can start: the whole review below the top bar, from its start edge. */
export function UndoArea({
  gesture,
  children,
}: {
  gesture: ReturnType<typeof useUndoSwipe>["gesture"];
  children: ReactNode;
}) {
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View collapsable={false} style={{ flex: 1 }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

/** The top card's place: how it moves while dragged, and how a new one arrives. */
export interface TopCard {
  /** A new key for each card, so each new one arrives. */
  turn: string;
  style: AnimatedStyle<ViewStyle>;
  entering: InstanceType<typeof Keyframe> | typeof CROSSFADE | undefined;
}

/**
 * The review is a stack: each graded step, card and grades, stays underneath, and the next card slides
 * in over it from the end edge, turned a little, straightening as it lands. Taking a grade back drags
 * the top card off the same way and uncovers the graded step as it was. Under reduced motion the next
 * card fades in. `children` draws the top step and puts `TopCard` on its card.
 */
export function CardStack({
  swipe,
  under,
  turn,
  arrive,
  children,
}: {
  swipe: ReturnType<typeof useUndoSwipe>;
  /** The last graded step, underneath, or nothing when there is none. */
  under: ReactNode;
  /** Which card is on top at which point of the review. */
  turn: string;
  /** Whether a new top card slides in: after a grade, not after taking one back. */
  arrive: boolean;
  children: (top: TopCard) => ReactNode;
}) {
  const { x, dir, arriving } = swipe;
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  // The graded step stays until the top card is back at rest, so landing an undo never blinks.
  const kept = useRef<ReactNode>(null);
  if (under) kept.current = under;
  const placed = useRef(turn);
  useEffect(() => {
    if (placed.current === turn) return;
    placed.current = turn;
    x.value = 0;
  }, [turn, x]);

  const slideIn = useMemo(
    () =>
      new Keyframe({
        0: { transform: [{ translateX: dir * width }, { rotate: `${dir * TILT}deg` }] },
        100: { transform: [{ translateX: 0 }, { rotate: "0deg" }], easing: ARRIVE_EASE },
      })
        .duration(ARRIVE_MS)
        .reduceMotion(ALWAYS),
    [dir, width],
  );
  const style = useAnimatedStyle(
    (): ViewStyle => ({
      transform: [
        { translateX: x.value * dir },
        { rotate: `${(dir * x.value * TILT) / width}deg` },
      ],
    }),
  );
  // At rest the graded step is hidden, so nothing of it shows past the top card's corners.
  const underStyle = useAnimatedStyle(() => ({
    opacity: x.value > 0.5 || arriving.value > 0 ? 1 : 0,
  }));

  return (
    <View style={{ flex: 1 }}>
      {kept.current && (
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[StyleSheet.absoluteFill, underStyle]}
        >
          {kept.current}
        </Animated.View>
      )}
      {children({ turn, style, entering: arrive ? (reduce ? CROSSFADE : slideIn) : undefined })}
    </View>
  );
}
