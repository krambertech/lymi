import { View } from "react-native";

export function Radio({ on, className = "" }: { on: boolean; className?: string }) {
  return (
    <View
      className={`size-[22px] items-center justify-center rounded-full border-2 ${on ? "border-ink" : "border-edge-strong"} ${className}`}
    >
      {on && <View className="size-2.5 rounded-full bg-ink" />}
    </View>
  );
}
