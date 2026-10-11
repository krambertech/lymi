import { HStack, Image, RoundedRectangle, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
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

export interface WeekProps {
  streak: number;
  due: number;
  /** Reviews still to go before today counts; 0 once it does. */
  left: number;
  /** Seven days, oldest first; each 0 to 3, the steps of the seven lights. */
  week: number[];
  flame: string;
}

/** The streak's week as seven glasses, the light climbing each with what the day held. */
const WeekWidget = (props: WeekProps, env: WidgetEnvironment) => {
  "widget";
  const dark = env.colorScheme === "dark";
  const ink = dark ? "#f1eee7" : "#1c140f";
  const muted = dark ? "#a89c90" : "#72665f";
  const canvas = dark ? "#130d09" : "#f8f6f4";
  const glass = dark ? "#29211b" : "#ece8e2";
  const steps = dark
    ? ["#29211b", "#8a6333", "#c88e3e", "#fdb443"]
    : ["#ece8e2", "#f7d29a", "#f6bd63", "#f8ac3d"];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const ids = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const today = props.left === 0 ? "Today counts" : `${props.left} to today’s goal`;
  const due = props.due === 1 ? "1 card due" : `${props.due} cards due`;

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[containerBackground(canvas, "widget"), widgetURL("lymi://review")]}
    >
      <HStack spacing={6} alignment="center">
        <Image uiImage={props.flame} modifiers={[resizable(), frame({ width: 15, height: 19 })]} />
        <Text
          modifiers={[
            font({ size: 22, weight: "medium" }),
            monospacedDigit(),
            foregroundStyle(ink),
          ]}
        >
          {String(props.streak)}
        </Text>
        <Text modifiers={[font({ size: 15 }), foregroundStyle(muted)]}>days in a row</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(muted)]}>
          {due}
        </Text>
      </HStack>
      <Spacer />
      <HStack spacing={0} alignment="bottom">
        {props.week.map((level, i) => (
          <VStack spacing={6} key={ids[i]} modifiers={[frame({ maxWidth: 1000 })]}>
            <ZStack alignment="bottom">
              <RoundedRectangle
                cornerRadius={7}
                modifiers={[foregroundStyle(glass), frame({ width: 30, height: 40 })]}
              />
              <RoundedRectangle
                cornerRadius={7}
                modifiers={[
                  foregroundStyle(steps[level] ?? glass),
                  frame({ width: 30, height: (40 * level) / 3 }),
                ]}
              />
            </ZStack>
            <Text
              modifiers={[
                font({ size: 11, weight: i === 6 ? "semibold" : "regular" }),
                foregroundStyle(i === 6 ? ink : muted),
              ]}
            >
              {days[i] ?? ""}
            </Text>
          </VStack>
        ))}
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{today}</Text>
    </VStack>
  );
};

export default createWidget<WeekProps>("WeekWidget", WeekWidget);
