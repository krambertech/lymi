import type { ComponentProps, ReactNode } from "react";
import { Platform, ScrollView, type ViewStyle } from "react-native";
import {
  KeyboardAwareScrollView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function KeyboardRoom({
  className,
  style,
  hold,
  children,
}: {
  className?: string;
  style?: ViewStyle;
  hold?: SharedValue<number>;
  children: ReactNode;
}) {
  const { height } = useReanimatedKeyboardAnimation();
  const { bottom } = useSafeAreaInsets();
  const room = useAnimatedStyle(() => ({
    paddingBottom: Math.max(-height.value, hold?.value ?? 0, bottom),
  }));
  return (
    <Animated.View className={`flex-1 ${className ?? ""}`} style={[style, room]}>
      {children}
    </Animated.View>
  );
}

export const DISMISS_ON_DRAG = Platform.OS === "ios" ? "interactive" : "on-drag";

export function KeyboardScroll(props: ComponentProps<typeof ScrollView>) {
  if (Platform.OS === "android") {
    return (
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        mode="layout"
        {...props}
      />
    );
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets {...props} />
  );
}
