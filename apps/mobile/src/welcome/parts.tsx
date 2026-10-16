import { useLingui } from "@lingui/react/macro";
import { CHOICE_POP } from "@lymi/design";
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
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

/**
 * Review in three steps down one line, all lit from the start: lit one by one, they flashed on the
 * phone rather than read as a sequence. onboarding.md "On the phone".
 */
export function HowItWorks() {
  const { t } = useLingui();
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
          <HowStep key={line} n={i + 1} last={i === steps.length - 1}>
            {line}
          </HowStep>
        ))}
      </View>
    </Plate>
  );
}

function HowStep({ n, last, children }: { n: number; last: boolean; children: string }) {
  const p = usePalette();
  return (
    <View className="flex-row items-start gap-3">
      {!last && (
        // Plain styles, since Uniwind's `absolute` class drops inline insets.
        <View
          style={{
            position: "absolute",
            start: 11,
            top: 28,
            bottom: -16,
            width: 2,
            borderRadius: 1,
            backgroundColor: p.amber,
          }}
          accessibilityElementsHidden
        />
      )}
      <View
        className="size-6 items-center justify-center rounded-full bg-amber"
        accessibilityElementsHidden
      >
        <Text
          className="text-xs font-medium"
          style={{ color: p["amber-ink"], fontVariant: ["tabular-nums"] }}
        >
          {n}
        </Text>
      </View>
      <Text className="flex-1 pt-0.5 text-base text-text">{children}</Text>
    </View>
  );
}
