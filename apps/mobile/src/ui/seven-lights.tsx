import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { daysReviewed } from "@lymi/core";
import { LIGHT_STEP_MS, type LightLevel, lightLevel, lightReference } from "@lymi/design";
import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "../theme/motion";
import { clear, type Palette, usePalette } from "../theme/palette";
import { weekLetters } from "./days";
import { Text } from "./primitives";

/** Three steps of amber from the lantern's glass to its flame. streak.md. */
function fill(p: Palette, level: Exclude<LightLevel, 0>) {
  return level === 3 ? p.amber : p[`light-${level}`];
}

/** The last seven days as seven glasses; the light climbs each one with what the day held. */
export function SevenLights({
  dates,
  days,
  goal,
  todayDone = false,
  satisfied,
  rest,
  goals,
  size = "lg",
  sequence,
}: {
  /** Each day's review-local YYYY-MM-DD, oldest first; a blank date has no letter. */
  dates: string[];
  days: number[];
  goal: number;
  todayDone?: boolean;
  /** Which days counted toward a streak; those are full whatever they held. */
  satisfied?: boolean[];
  /** Which days were rest days; their glass is edged in dashes. streak.md. */
  rest?: boolean[];
  /** Each day's own goal, so lowering today's goal never redraws an earlier day. */
  goals?: (number | null)[];
  size?: "sm" | "lg";
  /** At the end of a review the lights switch on one after another, from this many ms. */
  sequence?: number;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const lg = size === "lg";
  const today = days.length - 1;
  const letters = weekLetters(dates, i18n.locale);
  const reference = lightReference(days);
  const lit = daysReviewed(days, days.length);
  // Rest is named, never counted. PRODUCT.md.
  const label = rest?.some(Boolean)
    ? t`Reviewed on ${lit} of the last ${plural(days.length, { one: "# day", other: "# days" })}, including a rest day`
    : t`Reviewed on ${lit} of the last ${plural(days.length, { one: "# day", other: "# days" })}`;
  return (
    <View
      className={`flex-row items-end ${lg ? "justify-between" : "gap-2"}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      {days.map((n, i) => {
        const l = lightLevel(
          n,
          reference,
          goals ? goals[i] : goal,
          satisfied ? satisfied[i] : i === today && todayDone,
        );
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a day's place in the week is its identity.
          <View key={i} className={`items-center ${lg ? "gap-2" : "gap-1.5"}`}>
            <Glass
              level={l}
              lg={lg}
              p={p}
              today={i === today}
              resting={!!rest?.[i]}
              delay={sequence === undefined ? undefined : sequence + i * LIGHT_STEP_MS}
            />
            <Text className={`text-xs ${i === today ? "font-medium text-text-2" : "text-faint"}`}>
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
  resting,
  delay,
}: {
  level: LightLevel;
  lg: boolean;
  p: Palette;
  today: boolean;
  resting: boolean;
  delay?: number | undefined;
}) {
  const reduce = useReduceMotion();
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
    borderWidth: resting && lg ? 2 : 1,
    borderStyle: resting ? "dashed" : "solid",
    borderColor: resting ? p.amber : today && l === 0 ? p["edge-2"] : p.edge,
  };
  return (
    <View style={box}>
      {/* Tinted like the month's rest band, so the two read as one mark. */}
      {resting && <View className="absolute inset-0" style={{ backgroundColor: `${p.amber}12` }} />}
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0,
            transformOrigin: "50% 100%",
            backgroundColor: fill(p, l === 0 ? 1 : l),
            experimental_backgroundImage: `linear-gradient(to bottom, ${p["lit-sheen"]}, ${clear(p["lit-sheen"])} 70%)`,
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
