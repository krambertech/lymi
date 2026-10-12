import { type ReactNode, useEffect, useRef } from "react";
import { I18nManager, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useMMKVString } from "react-native-mmkv";
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
import { reviewStore, UNDO_MOTION_KEY } from "../data/kept";
import { ALWAYS } from "../theme/motion";

/** How far in from the start edge a swipe has to begin, as iOS's own back swipe. */
const EDGE = 28;
/** Past this share of the width, or on a flick, letting go takes the grade back. */
const LANDS = 0.4;
const BACK = { duration: 340, dampingRatio: 1, reduceMotion: ALWAYS };
/** Below this a spring back has settled; a spring can rest a fraction of a point short of zero. */
const MOVED = 0.5;
/** The card that is covered, or uncovered, sits back this far. */
const RECEDE = 0.95;

/**
 * Two ways the card can move while a pick is pending: the card on screen slides off toward the end
 * edge, uncovering the graded one under it, or the graded card slides back in over it from the start.
 */
export type UndoMotion = "off" | "back";

/** The motion the dev menu last chose; sliding off until one is picked. */
export function useUndoMotion(): UndoMotion {
  const [motion] = useMMKVString(UNDO_MOTION_KEY, reviewStore);
  return motion === "back" ? "back" : "off";
}

export function toggleUndoMotion() {
  const now = reviewStore.getString(UNDO_MOTION_KEY);
  reviewStore.set(UNDO_MOTION_KEY, now === "back" ? "off" : "back");
}

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
  return { gesture, x, dir };
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

/** The card on screen and the graded one, in the card's own place; only the cards move. */
export function UndoCards({
  x,
  dir,
  motion,
  under,
  turn,
  children,
}: {
  x: SharedValue<number>;
  dir: number;
  motion: UndoMotion;
  /** The last graded card as it will come back, or nothing when there is none. */
  under: ReactNode;
  /** Changes with each grade and undo; the cards return to rest once the screen has. */
  turn: string | null;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  // The graded card stays until the cards are back at rest, so landing an undo never blinks.
  const kept = useRef<ReactNode>(null);
  if (under) kept.current = under;
  const placed = useRef(turn);
  useEffect(() => {
    if (placed.current === turn) return;
    placed.current = turn;
    x.value = 0;
  }, [turn, x]);

  const current = useAnimatedStyle(() => {
    const t = x.value / width;
    return motion === "off"
      ? { transform: [{ translateX: x.value * dir }, { rotate: `${dir * t * 4}deg` }] }
      : { transform: [{ scale: 1 - (1 - RECEDE) * t }], opacity: 1 - t * 0.4 };
  });
  const graded = useAnimatedStyle(() => {
    const t = x.value / width;
    return motion === "off"
      ? {
          opacity: x.value > MOVED ? interpolate(t, [0, 0.3], [0.6, 1], "clamp") : 0,
          transform: [{ scale: RECEDE + (1 - RECEDE) * t }],
        }
      : {
          opacity: x.value > MOVED ? 1 : 0,
          transform: [{ translateX: -dir * (width - x.value) }],
        };
  });

  const gradedLayer = kept.current && (
    <Animated.View
      key="graded"
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, graded]}
    >
      {kept.current}
    </Animated.View>
  );
  const currentLayer = (
    <Animated.View key="current" style={[{ flex: 1 }, current]}>
      {children}
    </Animated.View>
  );
  // Sliding off, the graded card waits underneath; sliding back, it comes in on top.
  return (
    <Animated.View style={{ flex: 1 }}>
      {motion === "off" ? [gradedLayer, currentLayer] : [currentLayer, gradedLayer]}
    </Animated.View>
  );
}
