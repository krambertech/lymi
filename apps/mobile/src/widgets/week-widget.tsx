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
import type { WidgetColours } from "./colours";

type Paint = Parameters<typeof foregroundStyle>[0];

export interface WeekProps {
  streak: number;
  due: number;
  /** Reviews still to go before today counts; 0 once it does. */
  left: number;
  /** Seven days, oldest first; each 0 to 3, the steps of the seven lights. */
  week: number[];
  /** Each day's narrow weekday, oldest first, so today's letter is right on every day. */
  letters: string[];
  flame: string;
  colours: WidgetColours;
}

/** The streak's week as seven glasses, the light climbing each with what the day held. */
const WeekWidget = (props: WeekProps, env: WidgetEnvironment) => {
  "widget";
  // The gallery and a fresh install render the widget before the app has sent anything.
  const room = props.colours?.[env.colorScheme === "dark" ? "dark" : "light"];
  const ink: Paint = room?.ink ?? { type: "hierarchical", style: "primary" };
  const muted: Paint = room?.muted ?? { type: "hierarchical", style: "secondary" };
  const canvas: Paint = room?.canvas ?? { type: "material", material: "regular" };
  const glass: Paint = room?.lights[0] ?? { type: "hierarchical", style: "quaternary" };
  const week = props.week ?? [0, 0, 0, 0, 0, 0, 0];
  const letters = props.letters ?? ["", "", "", "", "", "", ""];
  const ids = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"];
  const left = props.left ?? 0;
  const dueCount = props.due ?? 0;
  const today = left === 0 ? "Today counts" : `${left} to today’s goal`;
  const due = dueCount === 1 ? "1 card due" : `${dueCount} cards due`;

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[containerBackground(canvas, "widget"), widgetURL("lymi://review")]}
    >
      <HStack spacing={6} alignment="center">
        {props.flame ? (
          <Image
            uiImage={props.flame}
            modifiers={[resizable(), frame({ width: 15, height: 19 })]}
          />
        ) : null}
        <Text
          modifiers={[
            font({ size: 22, weight: "medium" }),
            monospacedDigit(),
            foregroundStyle(ink),
          ]}
        >
          {String(props.streak ?? 0)}
        </Text>
        <Text modifiers={[font({ size: 15 }), foregroundStyle(muted)]}>days in a row</Text>
        <Spacer />
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(muted)]}>
          {due}
        </Text>
      </HStack>
      <Spacer />
      <HStack spacing={0} alignment="bottom">
        {week.map((level, i) => (
          <VStack spacing={6} key={ids[i]} modifiers={[frame({ maxWidth: 1000 })]}>
            <ZStack alignment="bottom">
              <RoundedRectangle
                cornerRadius={7}
                modifiers={[foregroundStyle(glass), frame({ width: 30, height: 40 })]}
              />
              <RoundedRectangle
                cornerRadius={7}
                modifiers={[
                  foregroundStyle(room?.lights[level] ?? glass),
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
              {letters[i] ?? ""}
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
