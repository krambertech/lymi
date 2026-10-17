import { HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  resizable,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { WidgetText } from "../i18n/widgets";
import type { WidgetColours } from "./colours";

type Paint = Parameters<typeof foregroundStyle>[0];

export interface Lanterns {
  dark: string;
  light: string;
  darkOut: string;
  lightOut: string;
}

export interface TodayProps {
  text: WidgetText;
  /** No streak and no review yet today: the lantern is out. */
  out: boolean;
  /** file:// paths in the shared app group, one lantern per room and state. */
  lanterns: Lanterns;
  colours: WidgetColours;
}

/**
 * The lantern lit in its own pool of light, with what is due under it. The whole widget opens
 * the review. Runs in the widget's runtime, so every value lives inside the function.
 */
const TodayWidget = (props: TodayProps, env: WidgetEnvironment) => {
  "widget";
  const dark = env.colorScheme === "dark";
  // The gallery and a fresh install render the widget before the app has sent anything.
  const room = props.colours?.[dark ? "dark" : "light"];
  const ink: Paint = room?.ink ?? { type: "hierarchical", style: "primary" };
  const muted: Paint = room?.muted ?? { type: "hierarchical", style: "secondary" };
  const backdrop = (center: { x: number; y: number }, endRadius: number): Paint =>
    room
      ? {
          type: "radialGradient",
          colors: [room.pool, room.canvas],
          center,
          startRadius: 0,
          endRadius,
        }
      : { type: "material", material: "regular" };
  const text = props.text;
  const lanterns = props.lanterns;
  const lit = dark ? lanterns?.dark : lanterns?.light;
  const out = dark ? lanterns?.darkOut : lanterns?.lightOut;
  const lantern = (props.out ? out : lit) ?? "";

  if (env.widgetFamily === "systemMedium") {
    return (
      <HStack
        spacing={18}
        modifiers={[
          containerBackground(backdrop({ x: 0.22, y: 0.5 }, 150), "widget"),
          widgetURL("lymi://review?from=widget"),
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
            {text?.dueCount ?? "0"}
          </Text>
          <Text modifiers={[font({ size: 16 }), foregroundStyle(muted)]}>
            {text?.dueLabel ?? ""}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 14, weight: "medium" }), foregroundStyle(muted)]}>
            {text?.streakLine ?? ""}
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
        containerBackground(backdrop({ x: 0.5, y: 0.38 }, 96), "widget"),
        widgetURL("lymi://review?from=widget"),
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
          {text?.dueCount ?? "0"}
        </Text>
        <Text
          modifiers={[
            font({ size: 15 }),
            lineLimit(1),
            minimumScaleFactor(0.75),
            foregroundStyle(muted),
          ]}
        >
          {text?.dueShort ?? ""}
        </Text>
      </HStack>
    </VStack>
  );
};

export default createWidget<TodayProps>("TodayWidget", TodayWidget);
