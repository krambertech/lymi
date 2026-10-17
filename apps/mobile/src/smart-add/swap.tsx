import { EASE_OUT } from "@lymi/design";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ALWAYS, curve, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";

interface SwapProps {
  /** What is shown; a new id slides the old content out and the new in. */
  id: string | number;
  children: ReactNode;
  /** How far each moves, in points: the old up and out, the new up from below. */
  distance?: number;
  /** The row's height, which both share while they pass. */
  height: number;
  duration?: number;
}

/** Content that changes in place: the old slides up and fades as the new rises in, or crossfades under Reduce Motion. */
export function Swap({ id, children, distance = 8, height, duration = 300 }: SwapProps) {
  const reduce = useReduceMotion();
  // The content each id first arrived with: what slides out once the next id comes.
  const [state, setState] = useState<{ id: SwapProps["id"]; node: ReactNode; previous: ReactNode }>(
    { id, node: children, previous: null },
  );
  if (state.id !== id) setState({ id, node: children, previous: state.node });
  const progress = useSharedValue(1);
  const first = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the content changes
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: curve(EASE_OUT), reduceMotion: ALWAYS });
  }, [state.id]);
  const previous = state.previous;

  const travel = reduce ? 0 : distance;
  const into = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * travel }],
  }));
  const out = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -progress.value * travel }],
  }));

  return (
    <View className="w-full items-center overflow-hidden" style={{ height }}>
      {previous !== null && (
        <Animated.View
          className="absolute inset-x-0 items-center"
          style={out}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {previous}
        </Animated.View>
      )}
      <Animated.View className="absolute inset-x-0 items-center" style={into}>
        {state.id === id ? children : state.node}
      </Animated.View>
    </View>
  );
}

/** The amber dot beside the reading line, breathing while the lesson is read, as the web's pulses. */
export function Pulse({ running }: { running: boolean }) {
  const reduce = useReduceMotion();
  const level = useSharedValue(1);
  useEffect(() => {
    if (!running || reduce) {
      cancelAnimation(level);
      level.value = 1;
      return;
    }
    level.value = withRepeat(withTiming(0.3, { duration: 900, reduceMotion: ALWAYS }), -1, true);
    return () => cancelAnimation(level);
  }, [running, reduce, level]);
  const p = usePalette();
  const style = useAnimatedStyle(() => ({ opacity: level.value }));
  // Sized in the style: the half-step size class did not apply on this animated view.
  return (
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.amber }, style]}
    />
  );
}
