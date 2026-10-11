import { Gauge, HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  gaugeStyle,
  monospacedDigit,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export interface LockProps {
  due: number;
  streak: number;
  reviewed: number;
  goal: number;
}

/** The Lock Screen draws in one tint, so the flame is a symbol and the day is a gauge. */
const LockWidget = (props: LockProps, env: WidgetEnvironment) => {
  "widget";
  // The gallery and a fresh install render the widget before the app has sent anything.
  const dueCount = props.due ?? 0;
  const streak = props.streak ?? 0;
  const goal = props.goal ?? 0;
  const progress = goal > 0 ? Math.min(1, (props.reviewed ?? 0) / goal) : 0;
  const due = dueCount === 1 ? "1 card due" : `${dueCount} cards due`;
  // WidgetKit asks every widget for a container background; the Lock Screen draws its own.
  const clear = containerBackground("#00000000", "widget");

  if (env.widgetFamily === "accessoryCircular") {
    return (
      <Gauge
        value={progress}
        modifiers={[gaugeStyle("circularCapacity"), clear, widgetURL("lymi://review")]}
        currentValueLabel={
          <VStack spacing={0}>
            <Image systemName="flame.fill" size={12} />
            <Text modifiers={[font({ size: 17, weight: "semibold" }), monospacedDigit()]}>
              {String(dueCount)}
            </Text>
          </VStack>
        }
      />
    );
  }

  if (env.widgetFamily === "accessoryInline") {
    return <Text modifiers={[clear]}>{`${due} · ${streak} days`}</Text>;
  }

  return (
    <VStack alignment="leading" spacing={2} modifiers={[clear, widgetURL("lymi://review")]}>
      <HStack spacing={4}>
        <Image systemName="flame.fill" size={13} />
        <Text
          modifiers={[font({ size: 15, weight: "semibold" })]}
        >{`${streak} days in a row`}</Text>
      </HStack>
      <Text modifiers={[font({ size: 15 })]}>{due}</Text>
      <Gauge value={progress} modifiers={[gaugeStyle("linearCapacity")]} />
    </VStack>
  );
};

export default createWidget<LockProps>("LockWidget", LockWidget);
