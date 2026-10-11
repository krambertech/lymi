import { useState } from "react";
import { View } from "react-native";
import { Uniwind } from "uniwind";
import { type Directions, useStore } from "../../../data/store";
import { usePalette } from "../../../theme/palette";
import { Button, Icon, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { Segmented } from "../../../ui/segmented";

const CHOICES: {
  key: keyof Directions;
  title: string;
  options: { value: string; label: string; line: string }[];
}[] = [
  {
    key: "chrome",
    title: "Navigation",
    options: [
      { value: "glass", label: "Glass pill", line: "The web’s pill and top bar, in Liquid Glass." },
      {
        value: "lymi",
        label: "Opaque pill",
        line: "The web’s pill and top bar, exactly as on the web.",
      },
    ],
  },
  {
    key: "today",
    title: "Today’s lead",
    options: [
      { value: "plate", label: "Lantern plate", line: "The due card as on the web." },
      {
        value: "lit",
        label: "Lit room",
        line: "No plate: the lantern lights the top of the screen.",
      },
    ],
  },
  {
    key: "type",
    title: "Type",
    options: [
      {
        value: "onest",
        label: "Onest",
        line: "Lymi’s face everywhere; iOS menus and alerts stay SF.",
      },
      { value: "system", label: "SF", line: "San Francisco everywhere, as Apple’s own apps." },
      {
        value: "mixed",
        label: "Mixed",
        line: "Onest for titles, the word and big numbers; SF for the rest.",
      },
    ],
  },
  {
    key: "review",
    title: "Grading",
    options: [
      { value: "buttons", label: "Plates", line: "The four grades as on the web." },
      { value: "glass", label: "Glass", line: "The same four grades in Liquid Glass." },
      {
        value: "swipe",
        label: "Swipe",
        line: "Plates, and after the reveal swipe right for Good, left for Forgot.",
      },
    ],
  },
];

export default function You() {
  const { directions, setDirection, reset } = useStore();
  const p = usePalette();
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  return (
    <Screen title="You">
      <Plate className="flex-row items-center gap-4 p-4">
        <View className="size-14 items-center justify-center rounded-full bg-plate-2 border border-edge">
          <Text className="text-xl font-medium text-text-2">K</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-medium text-text">Kateryna</Text>
          <Text className="text-base text-muted">Estonian and Portuguese</Text>
        </View>
      </Plate>

      <View>
        <SectionTitle>Design directions</SectionTitle>
        <Text className="px-1 pb-4 text-base text-text-2">
          This proof of concept puts each open choice side by side. Switch one and go back to Today
          or a review.
        </Text>
        <View className="gap-6">
          {CHOICES.map((c) => {
            const chosen = c.options.find((o) => o.value === directions[c.key]);
            return (
              <View key={c.key} className="gap-2">
                <Text className="px-1 text-md font-medium text-text">{c.title}</Text>
                <Segmented
                  label={c.title}
                  value={directions[c.key]}
                  options={c.options}
                  onChange={(v) => setDirection(c.key, v as never)}
                />
                <Text className="px-1 text-base text-muted">{chosen?.line}</Text>
              </View>
            );
          })}
          <View className="gap-2">
            <Text className="px-1 text-md font-medium text-text">Room</Text>
            <Segmented
              label="Theme"
              value={theme}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              onChange={(v) => {
                setTheme(v);
                Uniwind.setTheme(v);
              }}
            />
          </View>
        </View>
      </View>

      <View>
        <SectionTitle>On the Home Screen</SectionTitle>
        <Plate className="flex-row gap-3 p-4">
          <Icon name="widgets" size={20} colour={p["text-2"]} />
          <Text className="flex-1 text-base text-text-2">
            Touch and hold the Home Screen, tap Edit, then Add Widget and pick Lymi. The Lock Screen
            has a lantern too.
          </Text>
        </Plate>
      </View>

      <Button label="Start today again" icon="reset" onPress={reset} />
    </Screen>
  );
}
