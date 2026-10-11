import { CHOICE_SLIDE } from "@lymi/design";
import { useState } from "react";
import { type LayoutRectangle, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { spring, useReduceMotion } from "../theme/motion";
import { Press, Text } from "./primitives";
import { useOnGlass } from "./surface";

const SLIDE = spring(CHOICE_SLIDE);

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
  const reduce = useReduceMotion();
  const glass = useOnGlass();
  const [rects, setRects] = useState<Partial<Record<T, LayoutRectangle>>>({});
  const chosen = rects[value];
  const plate = useAnimatedStyle(() => {
    if (!chosen) return { opacity: 0 };
    return {
      opacity: 1,
      width: reduce ? chosen.width : withSpring(chosen.width, SLIDE),
      transform: [{ translateX: reduce ? chosen.x : withSpring(chosen.x, SLIDE) }],
    };
  });
  return (
    <View
      className={`flex-row rounded-lg p-1 ${glass ? "bg-glass-plate" : "bg-plate-2"}`}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      <Animated.View
        className={`absolute top-1 bottom-1 rounded-md border border-edge ${glass ? "bg-glass-chosen" : "bg-chosen"}`}
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
            // Options share one row, so a deck's name grows only as far as it still reads whole.
            maxFontSizeMultiplier={1.3}
          >
            {o.label}
          </Text>
        </Press>
      ))}
    </View>
  );
}
