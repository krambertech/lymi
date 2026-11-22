import { View } from "react-native";
import { Text } from "./primitives";

export function DueCount({ count }: { count: number }) {
  return (
    <View className="min-h-6 min-w-6 items-center justify-center self-start rounded-full bg-amber-tint px-2">
      <Text
        className="text-xs font-semibold text-amber-tint-ink"
        style={{ fontVariant: ["tabular-nums"] }}
        maxFontSizeMultiplier={1.3}
      >
        {count}
      </Text>
    </View>
  );
}
