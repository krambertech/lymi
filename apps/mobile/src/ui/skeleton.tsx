import { useEffect } from "react";
import { type DimensionValue, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { clear, usePalette } from "../theme/palette";

/**
 * Holds a shape while it loads or while the AI writes it. A light sweeps across it only if motion
 * is welcome; under Reduce Motion it stays still.
 */
export function Skeleton({
  width = "100%",
  height = 12,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reduce) return;
    x.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.linear, reduceMotion: ALWAYS }),
      -1,
    );
  }, [reduce, x]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.value * 100}%` }] }));
  return (
    <View className="overflow-hidden rounded-xs bg-plate-2" style={{ width, height }}>
      {!reduce && (
        <Animated.View
          className="absolute inset-0"
          style={[
            {
              experimental_backgroundImage: `linear-gradient(90deg, ${clear(p.shimmer)}, ${p.shimmer}, ${clear(p.shimmer)})`,
            } as ViewStyle,
            sweep,
          ]}
        />
      )}
    </View>
  );
}
