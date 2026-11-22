import { languageScript, type Script, textDirection, unisolate } from "@lymi/core";
import { faces, shadows } from "@lymi/design";
import {
  Children,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  ActivityIndicator,
  I18nManager,
  Platform,
  Pressable,
  type PressableProps,
  Text as RNText,
  StyleSheet,
  type TextProps,
  useWindowDimensions,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useResolveClassNames } from "uniwind";
import { haptics } from "../theme/haptics";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { clear, type Palette, usePalette, useRoom } from "../theme/palette";
import { fitType } from "../theme/type";
import { Icon, type IconName } from "./icons";
import { useOnGlass } from "./surface";

export { Icon };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STEP = /(?:^|\s)(text-(?:2xs|xs|sm|base|md|lg|[2-7]?xl))(?=\s|$)/;

const HANZI_RUNS =
  /([\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef\u{20000}-\u{3134f}]+)/u;
const SCRIPT_RUNS: Record<Script, RegExp> = {
  Jpan: /([\u3000-\u303f\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef\u{20000}-\u{3134f}]+)/u,
  Hans: HANZI_RUNS,
  Hant: HANZI_RUNS,
  Taml: /([\u0b80-\u0bff\u{200c}\u{200d}]+)/u,
};

const RTL_IN_APP = {
  writingDirection: "rtl",
  textAlign: I18nManager.isRTL ? "right" : "left",
} as const;

const NAMES_FACES = Platform.OS === "ios";

function inScript(children: ReactNode, script: Script): ReactNode {
  const face = { fontFamily: faces[script][0] };
  return Children.map(children, (child) =>
    typeof child === "string"
      ? child.split(SCRIPT_RUNS[script]).map((run, i) =>
          i % 2 ? (
            // oxlint-disable-next-line react/no-array-index-key -- runs are derived from the string and never reorder.
            <RNText key={i} style={face}>
              {run}
            </RNText>
          ) : (
            run
          ),
        )
      : child,
  );
}

export function Text({
  className,
  style,
  maxFontSizeMultiplier,
  lang,
  children,
  ...props
}: Omit<TextProps, "lang"> & { className?: string; lang?: string | null; ref?: Ref<RNText> }) {
  const step = useResolveClassNames(className?.match(STEP)?.[1] ?? "");
  const { fontScale } = useWindowDimensions();
  const size = StyleSheet.flatten(style)?.fontSize ?? step.fontSize ?? 17;
  const fit = fitType(size, fontScale, maxFontSizeMultiplier ?? undefined);
  const script = NAMES_FACES ? languageScript(lang) : null;
  const rtl = textDirection(lang) === "rtl";
  return (
    <RNText
      className={`font-sans ${className ?? ""}`}
      dynamicTypeRamp={fit.ramp}
      maxFontSizeMultiplier={fit.cap}
      style={[{ letterSpacing: fit.letterSpacing }, rtl && RTL_IN_APP, style]}
      {...props}
    >
      {script ? inScript(children, script) : children}
    </RNText>
  );
}

export type ForcedState = "pressed" | "focused" | null;
export const ForcedStateContext = createContext<ForcedState>(null);

interface PressProps extends Omit<PressableProps, "style"> {
  scale?: number;
  haptic?: boolean;
  className?: string;
  style?: ViewStyle | ViewStyle[];
  drawn?: number;
}

export const TARGET = 44;

export function Press({
  scale = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  style,
  drawn,
  hitSlop,
  ...props
}: PressProps) {
  const reach = drawn !== undefined && drawn < TARGET ? Math.ceil((TARGET - drawn) / 2) : undefined;
  const reduce = useReduceMotion();
  const forced = useContext(ForcedStateContext) === "pressed";
  const s = useSharedValue(forced && !reduce ? scale : 1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...props}
      hitSlop={hitSlop ?? reach}
      onPressIn={(e) => {
        if (!reduce) s.value = withTiming(scale, { duration: 150 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics.press();
        onPress?.(e);
      }}
      style={[animated, style]}
    />
  );
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

const HEIGHT: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 rounded-sm",
  md: "min-h-11 px-4 py-2 rounded-md",
  lg: "min-h-12 px-5 py-2.5 rounded-md",
  xl: "min-h-16 px-5 py-4 rounded-md",
};
const LABEL: Record<ButtonSize, string> = {
  sm: "text-sm",
  md: "text-md",
  lg: "text-md",
  xl: "text-lg",
};
const ICON: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20, xl: 20 };
const SLOP = { sm: 6, md: 0, lg: 0, xl: 0 } as const;

function look(variant: ButtonVariant, p: Palette, strong = false) {
  switch (variant) {
    case "primary":
      return { box: "bg-amber", ink: p["amber-ink"] };
    case "secondary":
      return {
        box: `bg-plate border ${strong ? "border-edge-strong" : "border-edge"}`,
        ink: p.ink,
      };
    case "ghost":
      return { box: "bg-transparent", ink: p["ink-secondary"] };
    case "danger":
      return { box: "bg-danger-soft", ink: p.danger };
  }
}

interface ButtonProps {
  label: string;
  detail?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  lead?: ReactNode;
  loading?: boolean;
  busy?: boolean;
  disabled?: boolean;
  strong?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function Button({
  label,
  detail,
  variant = "secondary",
  size = "md",
  icon,
  lead,
  loading = false,
  busy = false,
  disabled = false,
  strong = false,
  onPress,
  testID,
}: ButtonProps) {
  const p = usePalette();
  const { box, ink } = look(variant, p, strong);
  const inert = loading || busy || disabled;
  return (
    <Press
      onPress={inert ? undefined : onPress}
      haptic={!inert}
      hitSlop={SLOP[size]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : undefined}
      accessibilityState={{ busy: loading || busy, disabled }}
      className={`shrink flex-row items-center justify-center gap-2 ${box} ${HEIGHT[size]} ${disabled ? "opacity-45" : ""}`}
      style={variant === "primary" ? keyLight(p) : undefined}
    >
      <View className={`shrink flex-row items-center gap-2 ${loading ? "opacity-0" : ""}`}>
        {lead}
        {icon &&
          (busy ? (
            <Turning>
              <Icon name="loading" colour={ink} size={ICON[size]} />
            </Turning>
          ) : (
            <Icon name={icon} colour={ink} size={ICON[size]} />
          ))}
        <View className="shrink flex-row flex-wrap items-center justify-center gap-x-2">
          <Text className={`${LABEL[size]} shrink text-center font-medium`} style={{ color: ink }}>
            {label}
          </Text>
          {detail && (
            <Text
              className={`${LABEL[size]} shrink text-center`}
              style={{
                color: variant === "secondary" ? p["ink-muted"] : ink,
                fontVariant: ["tabular-nums"],
              }}
            >
              {detail}
            </Text>
          )}
        </View>
      </View>
      {loading && <ActivityIndicator color={ink} className="absolute" />}
    </Press>
  );
}

const ICON_BOX = { sm: "size-8", md: "size-11", lg: "size-12" } as const;
const ICON_GLYPH = { sm: 16, md: 20, lg: 22 } as const;

interface IconButtonProps {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: keyof typeof ICON_BOX;
  round?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  repeat?: boolean;
  busy?: boolean;
  glyph?: (ink: string, size: number) => ReactNode;
  reach?: number;
  onPress?: () => void;
  testID?: string;
}

const REPEAT_MS = 90;

export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  round = false,
  disabled = false,
  haptic = true,
  repeat = false,
  busy = false,
  glyph,
  reach,
  onPress,
  testID,
}: IconButtonProps) {
  const p = usePalette();
  const { box, ink } = look(variant, p);
  const slop = reach ?? (size === "sm" ? 6 : 0);
  const held = useRef<ReturnType<typeof setInterval>>(undefined);
  const release = () => clearInterval(held.current);
  useEffect(() => () => clearInterval(held.current), []);
  useEffect(() => {
    if (disabled) clearInterval(held.current);
  }, [disabled]);
  return (
    <Press
      onPress={disabled ? undefined : onPress}
      onLongPress={
        repeat && !disabled
          ? () => {
              held.current = setInterval(() => {
                haptics.tick();
                onPress?.();
              }, REPEAT_MS);
            }
          : undefined
      }
      delayLongPress={350}
      onPressOut={repeat ? release : undefined}
      haptic={haptic && !disabled}
      hitSlop={slop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={unisolate(label)}
      accessibilityState={{ disabled, busy }}
      className={`items-center justify-center ${box} ${ICON_BOX[size]} ${round ? "rounded-full" : "rounded-md"} ${disabled ? "opacity-45" : ""}`}
      style={variant === "primary" ? keyLight(p) : undefined}
    >
      {busy ? (
        <Turning>
          <Icon name="loading" size={ICON_GLYPH[size]} colour={ink} />
        </Turning>
      ) : glyph ? (
        glyph(ink, ICON_GLYPH[size])
      ) : (
        <Icon
          name={icon}
          size={ICON_GLYPH[size]}
          colour={ink}
          strokeWidth={variant === "primary" ? 2.25 : 2}
        />
      )}
    </Press>
  );
}

function Turning({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    turn.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear, reduceMotion: ALWAYS }),
      -1,
    );
    return () => cancelAnimation(turn);
  }, [turn, reduce]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function keyLight(p: Palette): ViewStyle {
  return {
    experimental_backgroundImage: `linear-gradient(to bottom, ${p["key-sheen"]}, ${clear(p["key-sheen"])})`,
    boxShadow: `inset 0 1px 0 ${p["key-edge"]}, inset 0 0 0 1px ${p["key-rim"]}`,
  } as ViewStyle;
}

export function Plate({
  className,
  style,
  children,
  ...props
}: ViewProps & { className?: string; children?: ReactNode }) {
  const dark = useRoom() === "dark";
  const glass = useOnGlass();
  return (
    <View
      {...props}
      className={`rounded-xl border border-edge ${glass ? "bg-glass-plate" : "bg-plate"} ${className ?? ""}`}
      style={[dark && !glass ? LIFT : null, style]}
    >
      {children}
    </View>
  );
}

export const LIFT = { boxShadow: shadows.dark.lift } as ViewStyle;

export function RowArrow() {
  const p = usePalette();
  return <Icon name="forward" size={18} colour={p["ink-muted"]} strokeWidth={2.5} />;
}

export function SectionTitle({ children, end }: { children: string; end?: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between px-1 pb-3 pt-2">
      <Text className="text-lg font-medium text-ink" accessibilityRole="header">
        {children}
      </Text>
      {end}
    </View>
  );
}
