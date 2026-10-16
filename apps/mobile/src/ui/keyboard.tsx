import type { ComponentProps, ReactNode } from "react";
import { Platform, ScrollView, type ViewStyle } from "react-native";
import {
  KeyboardAwareScrollView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * A screen or sheet whose foot rides on the keyboard frame by frame, so its fields and actions stay
 * in sight; with the keyboard down the foot clears the home indicator. It reads the keyboard's own
 * height rather than measuring itself, which a sheet's offset from the top of the screen would throw.
 */
export function KeyboardRoom({
  className,
  style,
  hold,
  children,
}: {
  className?: string;
  style?: ViewStyle;
  /** A foot kept at least this tall, so the content holds still while the keyboard leaves. */
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

/** How a list under a search field lets the keyboard go: iOS follows the finger, Android drops it on a drag. */
export const DISMISS_ON_DRAG = Platform.OS === "ios" ? "interactive" : "on-drag";

/**
 * A scrolling form that keeps its focused field and the action under it above the keyboard: iOS
 * insets the scroll itself, while Android's edge-to-edge window needs it done for it.
 */
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
