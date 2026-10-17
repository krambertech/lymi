import { View } from "react-native";

/** A radio's mark: an empty ring, or a ring around a dot once chosen. */
export function Radio({ on, className = "" }: { on: boolean; className?: string }) {
  return (
    <View
      className={`size-[22px] items-center justify-center rounded-full border-2 ${on ? "border-text" : "border-edge-2"} ${className}`}
    >
      {on && <View className="size-2.5 rounded-full bg-text" />}
    </View>
  );
}
