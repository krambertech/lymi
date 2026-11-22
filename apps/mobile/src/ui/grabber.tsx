import { View } from "react-native";

export function Grabber({ below = 0 }: { below?: number }) {
  return (
    <View
      pointerEvents="none"
      className="absolute h-[5px] w-9 self-center rounded-full bg-ink-faint"
      style={{ top: below + 6 }}
    />
  );
}
