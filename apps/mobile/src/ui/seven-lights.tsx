import { daysReviewed } from "@lymi/core";
import { LIGHT_STEP_MS, type LightLevel, lightLevel, lightReference } from "@lymi/design";
import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { type Palette, usePalette } from "../theme/palette";
import { weekLetters } from "./days";
import { Text } from "./primitives";

/** Three steps of amber from the lantern's glass to its flame. streak.md. */
function fill(p: Palette, level: Exclude<LightLevel, 0>) {
  return level === 3 ? p.amber : p[`light-${level}`];
}

/** The last seven days as seven glasses; the light climbs each one with what the day held. */
export function SevenLights({
  days,
  goal,
  todayDone = false,
  size = "lg",
  sequence,
}: {
  days: number[];
  goal: number;
  todayDone?: boolean;
  size?: "sm" | "lg";
  /** At the end of a review the lights switch on one after another, from this many ms. */
  sequence?: number;
}) {
  const p = usePalette();
  const lg = size === "lg";
  const today = days.length - 1;
  const letters = weekLetters(days.length);
  const reference = lightReference(days);
  const label = `Reviewed on ${daysReviewed(days, days.length)} of the last ${days.length} days`;
  return (
    <View
      className={`flex-row items-end ${lg ? "justify-between" : "gap-2"}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {days.map((n, i) => {
        const l = lightLevel(n, reference, goal, i === today && todayDone);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a day's place in the week is its identity.
          <View key={i} className={`items-center ${lg ? "gap-2" : "gap-1.5"}`}>
            <Glass
              level={l}
              lg={lg}
              p={p}
              today={i === today}
              delay={sequence === undefined ? undefined : sequence + i * LIGHT_STEP_MS}
            />
            <Text
              className={`${lg ? "text-xs" : "text-2xs"} ${i === today ? "font-medium text-text-2" : "text-faint"}`}
            >
              {letters[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Glass({
  level: l,
  lg,
  p,
  today,
  delay,
}: {
  level: LightLevel;
  lg: boolean;
  p: Palette;
  today: boolean;
  delay?: number | undefined;
}) {
  const reduce = useReducedMotion();
  const h = useSharedValue(delay === undefined ? l / 3 : 0);
  useEffect(() => {
    const to = l / 3;
    if (reduce) h.value = to;
    else if (delay !== undefined) h.value = withDelay(delay, withTiming(to, { duration: 300 }));
    else h.value = withTiming(to, { duration: 700 });
  }, [l, delay, reduce, h]);
  const rise = useAnimatedStyle(() => ({ transform: [{ scaleY: h.value }] }));
  const top = lg ? 6 : 4;
  const bottom = lg ? 8 : 5;
  const box: ViewStyle = {
    width: lg ? 32 : 13,
    aspectRatio: lg ? 8 / 11 : 13 / 18,
    borderTopLeftRadius: top,
    borderTopRightRadius: top,
    borderBottomLeftRadius: bottom,
    borderBottomRightRadius: bottom,
    overflow: "hidden",
    backgroundColor: p["plate-2"],
    borderWidth: 1,
    borderColor: today && l === 0 ? p["edge-2"] : p.edge,
  };
  return (
    <View style={box}>
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0,
            transformOrigin: "50% 100%",
            backgroundColor: fill(p, l === 0 ? 1 : l),
            experimental_backgroundImage: `linear-gradient(to bottom, ${p["lit-sheen"]}, transparent 70%)`,
            // Light caught along the top edge. A border, because a shadow on a clipped child breaks its corners.
            borderTopWidth: 1,
            borderTopColor: p["lit-edge"],
          } as ViewStyle,
          rise,
        ]}
      />
    </View>
  );
}
