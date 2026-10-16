import { Gauge, HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  gaugeStyle,
  monospacedDigit,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

import type { WidgetText } from "../i18n/widgets";

export interface LockProps {
  text: WidgetText;
  reviewed: number;
  goal: number;
}

/** The Lock Screen draws in one tint, so the flame is a symbol and the day is a gauge. */
const LockWidget = (props: LockProps, env: WidgetEnvironment) => {
  "widget";
  // The gallery and a fresh install render the widget before the app has sent anything.
  const text = props.text;
  const goal = props.goal ?? 0;
  const progress = goal > 0 ? Math.min(1, (props.reviewed ?? 0) / goal) : 0;
  // WidgetKit asks every widget for a container background; the Lock Screen draws its own.
  const clear = containerBackground("#00000000", "widget");

  if (env.widgetFamily === "accessoryCircular") {
    return (
      <Gauge
        value={progress}
        modifiers={[gaugeStyle("circularCapacity"), clear, widgetURL("lymi://review?from=widget")]}
        currentValueLabel={
          <VStack spacing={0}>
            <Image systemName="flame.fill" size={12} />
            <Text modifiers={[font({ size: 17, weight: "semibold" }), monospacedDigit()]}>
              {text?.dueCount ?? "0"}
            </Text>
          </VStack>
        }
      />
    );
  }

  if (env.widgetFamily === "accessoryInline") {
    return <Text modifiers={[clear]}>{text?.inline ?? ""}</Text>;
  }

  return (
    <VStack
      alignment="leading"
      spacing={2}
      modifiers={[clear, widgetURL("lymi://review?from=widget")]}
    >
      <HStack spacing={4}>
        <Image systemName="flame.fill" size={13} />
        <Text modifiers={[font({ size: 15, weight: "semibold" })]}>{text?.streakLine ?? ""}</Text>
      </HStack>
      <Text modifiers={[font({ size: 15 })]}>{text?.dueLine ?? ""}</Text>
      <Gauge value={progress} modifiers={[gaugeStyle("linearCapacity")]} />
    </VStack>
  );
};

export default createWidget<LockProps>("LockWidget", LockWidget);
