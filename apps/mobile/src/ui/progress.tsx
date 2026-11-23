import { EASE_OUT } from "@lymi/design";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ALWAYS, curve, useReduceMotion } from "../theme/motion";

const OUT = curve(EASE_OUT);

export function Progress({ value, label }: { value: number; label: string }) {
  const reduce = useReduceMotion();
  const v = Math.max(0, Math.min(1, value));
  const fill = useSharedValue(v);
  useEffect(() => {
    fill.value = reduce ? v : withTiming(v, { duration: 300, easing: OUT, reduceMotion: ALWAYS });
  }, [v, reduce, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      className="h-2 w-full overflow-hidden rounded-full bg-plate-nested"
    >
      <Animated.View className="h-full rounded-full bg-ink-secondary" style={style} />
    </View>
  );
}
