import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  Text as RNText,
  type TextProps,
  useColorScheme,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { usePalette } from "../theme/palette";
import { Icon, type IconName } from "./icons";

export { Icon };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Text in Onest. Size and colour come from the token classes, as on the web. */
export function Text({ className, ...props }: TextProps & { className?: string }) {
  return (
    <RNText className={`font-sans ${className ?? ""}`} maxFontSizeMultiplier={1.6} {...props} />
  );
}

interface PressProps extends Omit<PressableProps, "style"> {
  /** How far a press gives, from motion.md: 0.97 buttons, 0.98 cards, 0.96 grades. */
  scale?: number;
  haptic?: boolean;
  className?: string;
  style?: ViewStyle | ViewStyle[];
}

/** A press that gives a little over 150 ms and answers with a light tap. Nothing moves up. */
export function Press({
  scale = 0.97,
  haptic = true,
  onPressIn,
  onPress,
  style,
  ...props
}: PressProps) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        if (!reduce) s.value = withTiming(scale, { duration: 150 });
        onPressIn?.(e);
      }}
      onPressOut={() => {
        s.value = withTiming(1, { duration: 150 });
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={[animated, style]}
    />
  );
}

type Variant = "primary" | "secondary" | "ghost";

/** buttons.md: one primary per view, secondary by default. `xl` is Today's Review, 64 px. */
export function Button({
  label,
  variant = "secondary",
  size = "md",
  icon,
  onPress,
}: {
  label: string;
  variant?: Variant;
  size?: "md" | "xl";
  icon?: IconName;
  onPress?: () => void;
}) {
  const p = usePalette();
  const dark = useColorScheme() === "dark";
  const box =
    variant === "primary"
      ? "bg-amber"
      : variant === "secondary"
        ? "bg-plate border border-edge"
        : "bg-transparent";
  const ink = variant === "primary" ? p["amber-ink"] : p.text;
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      className={`flex-row items-center justify-center gap-2 rounded-md ${box} ${size === "xl" ? "h-16 px-5" : "h-11 px-4"}`}
      style={variant === "primary" ? keyLight(dark) : undefined}
    >
      {icon && <Icon name={icon} colour={ink} size={20} />}
      <Text
        className={`${size === "xl" ? "text-lg" : "text-md"} font-medium`}
        style={{ color: ink }}
      >
        {label}
      </Text>
    </Press>
  );
}

/** The one button to press: a soft fall of light along its top. surfaces.md "key-light". */
function keyLight(dark: boolean): ViewStyle {
  return {
    experimental_backgroundImage: `linear-gradient(to bottom, rgba(255,250,235,${dark ? 0.2 : 0.16}), transparent)`,
    boxShadow: "inset 0 1px 0 rgba(255,250,235,0.4)",
  } as ViewStyle;
}

/** A plate: flat by day with one hairline, lifted at night where the lamp catches its top edge. */
export function Plate({
  className,
  style,
  children,
  ...props
}: ViewProps & { className?: string; children?: ReactNode }) {
  const dark = useColorScheme() === "dark";
  return (
    <View
      {...props}
      className={`rounded-xl bg-plate border border-edge ${className ?? ""}`}
      style={[dark ? LIFT : null, style]}
    >
      {children}
    </View>
  );
}

export const LIFT = {
  boxShadow:
    "inset 0 1px 0 rgba(255,240,215,0.08), 0 1px 2px rgba(0,0,0,0.45), 0 12px 24px -14px rgba(0,0,0,0.8)",
} as ViewStyle;

/** An arrow in a circle: how a whole-row link ends. layout.md "Today". */
export function RowArrow() {
  const p = usePalette();
  return (
    <View className="size-9 items-center justify-center rounded-full bg-plate-2">
      <Icon name="forward" size={15} colour={p["text-2"]} />
    </View>
  );
}

export function SectionTitle({ children, end }: { children: string; end?: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between px-1 pb-3 pt-2">
      <Text className="text-lg font-medium text-text" accessibilityRole="header">
        {children}
      </Text>
      {end}
    </View>
  );
}
