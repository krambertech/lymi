import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  resizable,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export interface Lanterns {
  dark: string;
  light: string;
  darkOut: string;
  lightOut: string;
}

export interface TodayProps {
  due: number;
  streak: number;
  /** No streak and no review yet today: the lantern is out. */
  out: boolean;
  /** file:// paths in the shared app group, one lantern per room and state. */
  lanterns: Lanterns;
}

/**
 * The lantern lit in its own pool of light, with what is due under it. The whole widget opens
 * the review. Runs in the widget's runtime, so every value lives inside the function.
 */
const TodayWidget = (props: TodayProps, env: WidgetEnvironment) => {
  "widget";
  const dark = env.colorScheme === "dark";
  const ink = dark ? "#f1eee7" : "#1c140f";
  const muted = dark ? "#a89c90" : "#72665f";
  const canvas = dark ? "#130d09" : "#f8f6f4";
  const pool = dark ? "#5a3a14" : "#ffdca6";
  // The gallery and a fresh install render the widget before the app has sent anything.
  const due = props.due ?? 0;
  const streak = props.streak ?? 0;
  const lanterns = props.lanterns;
  const lit = dark ? lanterns?.dark : lanterns?.light;
  const out = dark ? lanterns?.darkOut : lanterns?.lightOut;
  const lantern = (props.out ? out : lit) ?? "";
  const line = due === 1 ? "card due" : "cards due";

  if (env.widgetFamily === "systemMedium") {
    return (
      <HStack
        spacing={18}
        modifiers={[
          containerBackground(
            {
              type: "radialGradient",
              colors: [pool, canvas],
              center: { x: 0.22, y: 0.5 },
              startRadius: 0,
              endRadius: 150,
            },
            "widget",
          ),
          widgetURL("lymi://review"),
        ]}
      >
        {lantern ? (
          <Image uiImage={lantern} modifiers={[resizable(), frame({ width: 116, height: 116 })]} />
        ) : null}
        <VStack alignment="leading" spacing={0}>
          <Text
            modifiers={[
              font({ size: 52, weight: "medium" }),
              monospacedDigit(),
              foregroundStyle(ink),
            ]}
          >
            {String(due)}
          </Text>
          <Text modifiers={[font({ size: 16 }), foregroundStyle(muted)]}>{line}</Text>
          <Spacer />
          <Text modifiers={[font({ size: 14, weight: "medium" }), foregroundStyle(muted)]}>
            {`${streak} days in a row`}
          </Text>
        </VStack>
        <Spacer />
      </HStack>
    );
  }

  return (
    <VStack
      spacing={4}
      modifiers={[
        containerBackground(
          {
            type: "radialGradient",
            colors: [pool, canvas],
            center: { x: 0.5, y: 0.38 },
            startRadius: 0,
            endRadius: 96,
          },
          "widget",
        ),
        widgetURL("lymi://review"),
      ]}
    >
      {lantern ? (
        <Image uiImage={lantern} modifiers={[resizable(), frame({ width: 88, height: 88 })]} />
      ) : null}
      <HStack spacing={5} alignment="firstTextBaseline">
        <Text
          modifiers={[
            font({ size: 28, weight: "medium" }),
            monospacedDigit(),
            foregroundStyle(ink),
          ]}
        >
          {String(due)}
        </Text>
        <Text modifiers={[font({ size: 15 }), foregroundStyle(muted)]}>due</Text>
      </HStack>
    </VStack>
  );
};

export default createWidget<TodayProps>("TodayWidget", TodayWidget);
