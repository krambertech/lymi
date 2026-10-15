import { useLingui } from "@lingui/react/macro";
import { CHOICE_POP } from "@lymi/design";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { springIn, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import type { IconName } from "../ui/icons";
import { Icon, Plate, Press, Text } from "../ui/primitives";

/** The chosen mark on a tile or row: an ink disc with a check, popping in on the choice spring. */
export function Tick() {
  const p = usePalette();
  const reduce = useReduceMotion();
  return (
    <Animated.View
      entering={reduce ? undefined : springIn(new ZoomIn(), CHOICE_POP)}
      className="size-6 items-center justify-center rounded-full bg-text"
    >
      <Icon name="check" size={14} colour={p.canvas} strokeWidth={3} />
    </Animated.View>
  );
}

/** One of a question's answers as a whole plate: a plain icon, its name and a line, ticked once chosen. */
export function ChoiceTile({
  icon,
  title,
  aside,
  detail,
  chosen,
  onPress,
}: {
  icon?: IconName | undefined;
  title: string;
  /** Beside the name, such as Good to start. */
  aside?: ReactNode;
  detail?: string | undefined;
  chosen: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={onPress}
      scale={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={detail ? `${title}, ${detail}` : title}
    >
      <Plate
        className="flex-row items-center gap-3.5 px-4 py-4"
        style={chosen ? { borderColor: p.text, borderWidth: 1.5 } : undefined}
      >
        {icon && <Icon name={icon} size={22} colour={p.text} strokeWidth={1.75} />}
        <View className="flex-1 gap-0.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-md font-medium text-text">{title}</Text>
            {aside}
          </View>
          {detail && <Text className="text-base text-text-2">{detail}</Text>}
        </View>
        {chosen ? <Tick /> : <View className="size-6" />}
      </Plate>
    </Press>
  );
}

const HOW_STEP_MS = 650;

/**
 * Review in three steps down one line. Once the plate has risen the flame's light runs down the line,
 * lighting each number as it reaches it, then rests with all three lit. onboarding.md "Motion".
 */
export function HowItWorks({ startAt }: { startAt: number }) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  const [reached, setReached] = useState(reduce ? 3 : 0);
  useEffect(() => {
    if (reduce) return;
    const timers = [0, 1, 2].map((i) =>
      setTimeout(() => setReached(i + 1), startAt + i * HOW_STEP_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [reduce, startAt]);
  const steps = [
    t`See a card and recall the answer.`,
    t`Say how well you knew it.`,
    t`Lymi brings it back just before you’d forget it.`,
  ];
  return (
    <Plate className="gap-4 p-5">
      <Text className="text-sm font-medium text-muted" accessibilityRole="header">
        {t`How it works`}
      </Text>
      <View className="gap-5">
        {steps.map((line, i) => (
          <HowStep key={line} n={i + 1} lit={reached > i} last={i === steps.length - 1}>
            {line}
          </HowStep>
        ))}
      </View>
    </Plate>
  );
}

function HowStep({
  n,
  lit,
  last,
  children,
}: {
  n: number;
  lit: boolean;
  last: boolean;
  children: string;
}) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const fill = useSharedValue(lit ? 1 : 0);
  useEffect(() => {
    fill.value = reduce
      ? lit
        ? 1
        : 0
      : withDelay(120, withTiming(lit ? 1 : 0, { duration: HOW_STEP_MS * 0.8 }));
  }, [lit, reduce, fill]);
  const line = useAnimatedStyle(() => ({ transform: [{ scaleY: fill.value }] }));
  return (
    <View className="flex-row items-start gap-3">
      {!last && (
        <View
          style={{
            position: "absolute",
            start: 11,
            top: 28,
            bottom: -16,
            width: 2,
            overflow: "hidden",
            backgroundColor: p["plate-2"],
          }}
          accessibilityElementsHidden
        >
          <Animated.View
            style={[{ flex: 1, backgroundColor: p.amber, transformOrigin: "top" }, line]}
          />
        </View>
      )}
      <View
        className={`size-6 items-center justify-center rounded-full ${lit ? "bg-amber" : "bg-plate-2"}`}
        accessibilityElementsHidden
      >
        <Text
          className="text-xs font-medium"
          style={{ color: lit ? p["amber-ink"] : p.muted, fontVariant: ["tabular-nums"] }}
        >
          {n}
        </Text>
      </View>
      <Text className={`flex-1 pt-0.5 text-base ${lit ? "text-text" : "text-muted"}`}>
        {children}
      </Text>
    </View>
  );
}
