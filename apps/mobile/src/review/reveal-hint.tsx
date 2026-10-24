import { useLingui } from "@lingui/react/macro";
import { revealHintDelayMs } from "@lymi/client/reveal-hint";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { reviewStore } from "../data/kept";
import { useStreak } from "../data/queries";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Icon, Text } from "../ui/primitives";
import { PEEK_ROOM } from "./hooks";

const REVEALS_KEY = "reveals";
/** Reveals on this phone after which the hint stops coming soon and waits for an idle card. */
const LEARNING_REVEALS = 1;

/** Counts a reveal on this phone, so the hint stops leading once the learner has found the card. */
export const countReveal = () =>
  reviewStore.set(REVEALS_KEY, (reviewStore.getNumber(REVEALS_KEY) ?? 0) + 1);

/** Whether the pointing hand shows on this card yet, by the web's rules. motion.md "Review". */
export function useRevealHint(card: string | null, revealed: boolean) {
  const reviewedDays = useStreak().data?.reviewedDays;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    if (!card || revealed) return;
    const learning = (reviewStore.getNumber(REVEALS_KEY) ?? 0) < LEARNING_REVEALS;
    const delay = revealHintDelayMs(reviewedDays, learning);
    if (delay === null) return;
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [card, revealed, reviewedDays]);
  return shown && !revealed;
}

/**
 * The pointing hand at the card's foot taps three times and rests with a line saying how to reveal.
 * Under reduced motion it appears without tapping. It floats over the card's foot, so the cue never
 * moves when it comes and goes; `lifted` keeps it clear of Peek at your hook.
 */
export function RevealHint({ lifted = false }: { lifted?: boolean }) {
  const { t } = useLingui();
  const p = usePalette();
  const reduce = useReduceMotion();
  const tap = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    tap.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 180, reduceMotion: ALWAYS }),
          withTiming(0, { duration: 180, reduceMotion: ALWAYS }),
          withTiming(0, { duration: 2140, reduceMotion: ALWAYS }),
        ),
        3,
        false,
        undefined,
        ALWAYS,
      ),
    );
  }, [reduce, tap]);
  const hand = useAnimatedStyle(() => ({
    transform: [{ translateY: tap.value * 3 }, { scale: 1 - tap.value * 0.1 }],
  }));
  return (
    <Animated.View
      entering={FadeIn.duration(300).reduceMotion(ALWAYS)}
      exiting={FadeOut.duration(100).reduceMotion(ALWAYS)}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className="absolute inset-x-0 items-center gap-1 px-5 pb-5"
      style={{ bottom: lifted ? PEEK_ROOM : 0 }}
    >
      <Animated.View style={hand}>
        <View className="size-11 items-center justify-center">
          <Icon name="pointer" size={24} colour={p.muted} strokeWidth={1.5} />
        </View>
      </Animated.View>
      <Text className="text-center text-sm font-medium text-muted">
        {t`Recall the answer, then tap the card`}
      </Text>
    </Animated.View>
  );
}
