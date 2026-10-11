import { useState } from "react";
import { type LayoutRectangle, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, withSpring } from "react-native-reanimated";
import { Press, Text } from "./primitives";

/** The chosen plate springs to the new option with a trace of overshoot. motion.md "Choices". */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  const [rects, setRects] = useState<Partial<Record<T, LayoutRectangle>>>({});
  const chosen = rects[value];
  const plate = useAnimatedStyle(() => {
    if (!chosen) return { opacity: 0 };
    const spring = { duration: 340, dampingRatio: 0.82 };
    return {
      opacity: 1,
      width: reduce ? chosen.width : withSpring(chosen.width, spring),
      transform: [{ translateX: reduce ? chosen.x : withSpring(chosen.x, spring) }],
    };
  });
  return (
    <View
      className="flex-row rounded-md bg-plate-2 p-1"
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      <Animated.View
        className="absolute top-1 bottom-1 rounded-sm border border-edge bg-chosen"
        style={[{ left: 0 }, plate]}
      />
      {options.map((o) => (
        <Press
          key={o.value}
          onLayout={(e) => {
            const layout = e.nativeEvent.layout;
            setRects((r) => ({ ...r, [o.value]: layout }));
          }}
          onPress={() => onChange(o.value)}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === o.value }}
          className="h-11 flex-1 items-center justify-center px-2"
        >
          <Text
            className={`text-md font-medium ${value === o.value ? "text-text" : "text-muted"}`}
            numberOfLines={1}
          >
            {o.label}
          </Text>
        </Press>
      ))}
    </View>
  );
}
