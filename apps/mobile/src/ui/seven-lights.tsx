import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { daysReviewed } from "@lymi/core";
import { LIGHT_STEP_MS, type LightLevel, lightLevel, lightReference } from "@lymi/design";
import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import Animated, {
  type AnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useReduceMotion } from "../theme/motion";
import { clear, type Palette, usePalette } from "../theme/palette";
import { weekLetters } from "./days";
import { Text } from "./primitives";

/** Three steps of amber from the lantern's glass to its flame. streak.md. */
function fill(p: Palette, level: Exclude<LightLevel, 0>) {
  return level === 3 ? p.amber : level === 2 ? p["lit-high"] : p["lit-low"];
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
  turn,
  todayRef,
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
  /**
   * When the day has just turned, today's light first shows the reviews it held before this one
   * (`from`), then fills at `at`, when the spark lands in it.
   */
  turn?: { at: number; from: number };
  /** Today's glass, for the spark to find it. */
  todayRef?: AnimatedRef<View>;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const lg = size === "lg";
  const today = days.length - 1;
  const letters = weekLetters(dates, i18n.locale);
  const reference = lightReference(days);
  const lit = daysReviewed(days, days.length);
  // Rest is named, never counted. docs/review.md.
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
        const landing = i === today && turn && sequence !== undefined ? turn : undefined;
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
              held={landing && lightLevel(landing.from, reference, goals ? goals[i] : goal, false)}
              fillAt={landing?.at}
              glassRef={i === today ? todayRef : undefined}
            />
            <Text
              className={`text-xs ${i === today ? "font-medium text-ink-secondary" : "text-ink-faint"}`}
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
  resting,
  delay,
  held: heldLevel,
  fillAt,
  glassRef,
}: {
  level: LightLevel;
  lg: boolean;
  p: Palette;
  today: boolean;
  resting: boolean;
  delay?: number | undefined;
  /** The level it rises to first, and when it fills from there to `level`. */
  held?: LightLevel | undefined;
  fillAt?: number | undefined;
  glassRef?: AnimatedRef<View> | undefined;
}) {
  const reduce = useReduceMotion();
  const h = useSharedValue(delay === undefined ? l / 3 : 0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    const to = l / 3;
    if (reduce) h.value = to;
    else if (delay !== undefined && heldLevel !== undefined && fillAt !== undefined) {
      h.value = withSequence(
        withDelay(delay, withTiming(heldLevel / 3, { duration: 300 })),
        withDelay(Math.max(0, fillAt - delay - 300), withTiming(to, { duration: 260 })),
      );
      pulse.value = withDelay(
        fillAt,
        withSequence(withTiming(1.08, { duration: 100 }), withTiming(1, { duration: 330 })),
      );
    } else if (delay !== undefined) h.value = withDelay(delay, withTiming(to, { duration: 300 }));
    else h.value = withTiming(to, { duration: 700 });
  }, [l, delay, heldLevel, fillAt, reduce, h, pulse]);
  const final = fill(p, l === 0 ? 1 : l);
  const held = heldLevel === undefined ? final : fill(p, heldLevel === 0 ? 1 : heldLevel);
  const step = (heldLevel ?? 0) / 3;
  const rise = useAnimatedStyle(() => ({
    transform: [{ scaleY: h.value }],
    // Until the spark lands the light keeps the colour it had before this review.
    backgroundColor: h.value > step + 0.01 ? final : held,
  }));
  const swell = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
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
    backgroundColor: p["plate-nested"],
    borderWidth: resting && lg ? 2 : 1,
    borderStyle: resting ? "dashed" : "solid",
    borderColor: resting ? p.amber : today && l === 0 ? p["edge-strong"] : p.edge,
  };
  return (
    <Animated.View ref={glassRef} style={[box, swell]}>
      {/* Tinted like the month's rest band, so the two read as one mark. */}
      {resting && <View className="absolute inset-0" style={{ backgroundColor: `${p.amber}12` }} />}
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0,
            transformOrigin: "50% 100%",
            experimental_backgroundImage: `linear-gradient(to bottom, ${p["lit-sheen"]}, ${clear(p["lit-sheen"])} 70%)`,
            // Light caught along the top edge. A border, because a shadow on a clipped child breaks its corners.
            borderTopWidth: 1,
            borderTopColor: p["lit-edge"],
          } as ViewStyle,
          rise,
        ]}
      />
    </Animated.View>
  );
}
