import { shadows } from "@lymi/design";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
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
import { type Palette, usePalette } from "../theme/palette";
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

const HEIGHT = { md: "h-11 px-4", lg: "h-12 px-5", xl: "h-16 px-5" } as const;

/**
 * buttons.md: one primary per view, secondary by default. `lg` ends a flow such as sign-in,
 * `xl` is Today's Review. `loading` keeps the width, shows a spinner and swallows a press.
 */
export function Button({
  label,
  variant = "secondary",
  size = "md",
  icon,
  lead,
  loading = false,
  onPress,
}: {
  label: string;
  variant?: Variant;
  size?: keyof typeof HEIGHT;
  icon?: IconName;
  /** A mark that is not one of Lymi's icons, such as Google's G. */
  lead?: ReactNode;
  loading?: boolean;
  onPress?: () => void;
}) {
  const p = usePalette();
  const box =
    variant === "primary"
      ? "bg-amber"
      : variant === "secondary"
        ? "bg-plate border border-edge"
        : "bg-transparent";
  const ink = variant === "primary" ? p["amber-ink"] : p.text;
  return (
    <Press
      onPress={loading ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
      className={`flex-row items-center justify-center gap-2 rounded-md ${box} ${HEIGHT[size]}`}
      style={variant === "primary" ? keyLight(p) : undefined}
    >
      <View className={`flex-row items-center gap-2 ${loading ? "opacity-0" : ""}`}>
        {lead}
        {icon && <Icon name={icon} colour={ink} size={20} />}
        <Text
          className={`${size === "md" ? "text-md" : "text-lg"} font-medium`}
          style={{ color: ink }}
        >
          {label}
        </Text>
      </View>
      {loading && <ActivityIndicator color={ink} className="absolute" />}
    </Press>
  );
}

/** The one button to press: a soft fall of light along its top. surfaces.md "key-light". */
function keyLight(p: Palette): ViewStyle {
  return {
    experimental_backgroundImage: `linear-gradient(to bottom, ${p["key-sheen"]}, transparent)`,
    boxShadow: `inset 0 1px 0 ${p["key-edge"]}, inset 0 0 0 1px ${p["key-rim"]}`,
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

/** The night's lift; by day surfaces stay flat. */
export const LIFT = { boxShadow: shadows.dark.lift } as ViewStyle;

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
