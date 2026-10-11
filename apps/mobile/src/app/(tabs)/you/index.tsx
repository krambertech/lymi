import { useState } from "react";
import { View } from "react-native";
import { Uniwind } from "uniwind";
import { useStore } from "../../../data/store";
import { usePalette } from "../../../theme/palette";
import { Button, Icon, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Screen } from "../../../ui/screen";
import { Segmented } from "../../../ui/segmented";

export default function You() {
  const { reset } = useStore();
  const p = usePalette();
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  return (
    <Screen title="You">
      <Plate className="flex-row items-center gap-4 p-4">
        <View className="size-14 items-center justify-center rounded-full border border-edge bg-plate-2">
          <Text className="text-xl font-medium text-text-2">K</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-medium text-text">Kateryna</Text>
          <Text className="text-base text-muted">Estonian and Portuguese</Text>
        </View>
      </Plate>

      <View className="gap-2">
        <SectionTitle>Theme</SectionTitle>
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
