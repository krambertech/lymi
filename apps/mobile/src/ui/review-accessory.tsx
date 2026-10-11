import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Pressable, View } from "react-native";
import { Lantern } from "../brand/lantern";
import { useProgress, useStore } from "../data/store";
import { usePalette } from "../theme/palette";
import { Icon, Text } from "./primitives";

/**
 * Review rides above the tab bar like a mini player, so it is one tap from every tab.
 * ADR 0005: review is a button, not a destination.
 */
export function ReviewAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { due, fed } = useStore();
  const progress = useProgress();
  const router = useRouter();
  const p = usePalette();
  const open = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/review");
  };
  const count = due.length;
  const line = count === 0 ? "Nothing due" : count === 1 ? "1 card due" : `${count} cards due`;

  if (placement === "inline") {
    return (
      <Pressable
        onPress={open}
        className="flex-1 flex-row items-center gap-2 px-3"
        accessibilityRole="button"
        accessibilityLabel={`Review, ${line}`}
      >
        <Lantern size={26} progress={progress} fed={fed} glow={false} />
        <Text className="text-base font-medium text-text" numberOfLines={1}>
          {count}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={open}
      className="flex-1 flex-row items-center gap-3 ps-2.5 pe-1.5"
      accessibilityRole="button"
      accessibilityLabel={`Review, ${line}`}
    >
      <Lantern size={34} progress={progress} fed={fed} glow={false} />
      <View className="flex-1">
        <Text className="text-base font-medium text-text" numberOfLines={1}>
          {line}
        </Text>
      </View>
      {count > 0 && (
        <View className="h-9 flex-row items-center gap-1.5 rounded-full bg-amber px-3.5">
          <Icon name="play" size={13} colour={p["amber-ink"]} />
          <Text className="text-base font-medium" style={{ color: p["amber-ink"] }}>
            Review
          </Text>
        </View>
      )}
    </Pressable>
  );
}
