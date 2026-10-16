import { View } from "react-native";

/** iOS's grabber, at its size and place, 6 pt below the sheet's top or what it clears. */
export function Grabber({ below = 0 }: { below?: number }) {
  return (
    <View
      pointerEvents="none"
      className="absolute h-[5px] w-9 self-center rounded-full bg-faint"
      style={{ top: below + 6 }}
    />
  );
}
