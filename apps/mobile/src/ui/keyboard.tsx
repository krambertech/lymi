import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * A screen or sheet whose foot rides on the keyboard frame by frame, so its fields and actions stay
 * in sight; with the keyboard down the foot clears the home indicator. It reads the keyboard's own
 * height rather than measuring itself, which a sheet's offset from the top of the screen would throw.
 */
export function KeyboardRoom({
  className,
  style,
  children,
}: {
  className?: string;
  style?: ViewStyle;
  children: ReactNode;
}) {
  const { height } = useReanimatedKeyboardAnimation();
  const { bottom } = useSafeAreaInsets();
  const room = useAnimatedStyle(() => ({ paddingBottom: Math.max(-height.value, bottom) }));
  return (
    <Animated.View className={`flex-1 ${className ?? ""}`} style={[style, room]}>
      {children}
    </Animated.View>
  );
}
