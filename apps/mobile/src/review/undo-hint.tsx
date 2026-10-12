import { useLingui } from "@lingui/react/macro";
import { useEffect } from "react";
import { I18nManager, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { reviewStore, UNDO_HINT_KEY } from "../data/kept";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Icon, Text } from "../ui/primitives";

/** The hint shows once on a phone, on the first card that has a grade before it to take back. */
export const undoHintSeen = () => reviewStore.getBoolean(UNDO_HINT_KEY) ?? false;
export const markUndoHintSeen = () => reviewStore.set(UNDO_HINT_KEY, true);

/** How far the hand travels in from the edge, as a finger does starting the swipe. */
const TRAVEL = 64;

/**
 * The pointing hand at the start edge sweeping in twice, then resting with the line that says what the
 * swipe does. Under reduced motion it rests from the start.
 */
export function UndoHint() {
  const { t } = useLingui();
  const p = usePalette();
  const reduce = useReduceMotion();
  const dir = I18nManager.isRTL ? -1 : 1;
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    const ease = Easing.bezier(0.23, 1, 0.32, 1);
    sweep.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: ease, reduceMotion: ALWAYS }),
          withDelay(300, withTiming(0, { duration: 0, reduceMotion: ALWAYS })),
          withTiming(0, { duration: 500, reduceMotion: ALWAYS }),
        ),
        2,
        false,
        undefined,
        ALWAYS,
      ),
    );
  }, [reduce, sweep]);
  const hand = useAnimatedStyle(() => ({
    opacity: sweep.value === 0 ? 1 : 1 - Math.max(0, sweep.value - 0.7) / 0.3,
    transform: [{ translateX: dir * TRAVEL * sweep.value }],
  }));
  return (
    <Animated.View
      entering={FadeIn.duration(300).reduceMotion(ALWAYS)}
      exiting={FadeOut.duration(140).reduceMotion(ALWAYS)}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      // Low on the card, clear of the word and above Tap to reveal.
      className="absolute inset-x-0 bottom-24 items-start gap-2 ps-1"
    >
      <Animated.View style={hand}>
        <View className="size-11 items-center justify-center">
          <Icon name="pointer" size={26} colour={p.muted} strokeWidth={1.5} />
        </View>
      </Animated.View>
      {/* The line sits inside the card while the hand starts at the screen's edge. */}
      <View className="ms-8 rounded-full bg-plate-2 px-3 py-1.5">
        <Text className="text-sm font-medium text-text-2">
          {t`Swipe from the edge to take back a grade`}
        </Text>
      </View>
    </Animated.View>
  );
}
