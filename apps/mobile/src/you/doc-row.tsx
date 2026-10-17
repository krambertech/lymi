import { openBrowserAsync } from "expo-web-browser";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import type { IconName } from "../ui/icons";
import { Icon, Press, Text } from "../ui/primitives";

/** A page of the docs as a row: what it is, a line on what it holds, and the arrow out. */
export function DocRow({
  icon,
  label,
  line,
  url,
}: {
  icon: IconName;
  label: string;
  line: string;
  url: string;
}) {
  const p = usePalette();
  return (
    <Press
      onPress={() => void openBrowserAsync(url)}
      scale={0.99}
      accessibilityRole="link"
      accessibilityLabel={`${label}, ${line}`}
    >
      <View className="min-h-[60px] flex-row items-center gap-3 py-3 ps-4 pe-4">
        <Icon name={icon} size={20} colour={p["text-2"]} />
        <View className="flex-1 gap-0.5">
          <Text className="text-md text-text">{label}</Text>
          <Text className="text-sm text-muted">{line}</Text>
        </View>
        <Icon name="web" size={18} colour={p.muted} strokeWidth={2.25} />
      </View>
    </Press>
  );
}
