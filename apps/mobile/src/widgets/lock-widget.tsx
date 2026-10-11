import { Gauge, HStack, Image, Text, VStack } from "@expo/ui/swift-ui";
import { font, gaugeStyle, monospacedDigit, widgetURL } from "@expo/ui/swift-ui/modifiers";
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
  const progress = props.goal > 0 ? Math.min(1, props.reviewed / props.goal) : 0;
  const due = props.due === 1 ? "1 card due" : `${props.due} cards due`;

  if (env.widgetFamily === "accessoryCircular") {
    return (
      <Gauge
        value={progress}
        modifiers={[gaugeStyle("circularCapacity"), widgetURL("lymi://review")]}
        currentValueLabel={
          <VStack spacing={0}>
            <Image systemName="flame.fill" size={12} />
            <Text modifiers={[font({ size: 17, weight: "semibold" }), monospacedDigit()]}>
              {String(props.due)}
            </Text>
          </VStack>
        }
      />
    );
  }

  if (env.widgetFamily === "accessoryInline") {
    return <Text>{`${due} · ${props.streak} days`}</Text>;
  }

  return (
    <VStack alignment="leading" spacing={2} modifiers={[widgetURL("lymi://review")]}>
      <HStack spacing={4}>
        <Image systemName="flame.fill" size={13} />
        <Text
          modifiers={[font({ size: 15, weight: "semibold" })]}
        >{`${props.streak} days in a row`}</Text>
      </HStack>
      <Text modifiers={[font({ size: 15 })]}>{due}</Text>
      <Gauge value={progress} modifiers={[gaugeStyle("linearCapacity")]} />
    </VStack>
  );
};

export default createWidget<LockProps>("LockWidget", LockWidget);
