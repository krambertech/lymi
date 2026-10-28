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

/** Each script's letters with the marks and full-width forms that run with them, none of which Onest has. */
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

// iOS falls back from Onest by the device's languages, so a script needs a named face; phone.md "Components".
const NAMES_FACES = Platform.OS === "ios";

/** The script's runs take its face and the rest stays in Onest, as the web's `:lang()` rules. */
function inScript(children: ReactNode, script: Script): ReactNode {
  const face = { fontFamily: faces[script][0] };
  return Children.map(children, (child) =>
    typeof child === "string"
      ? child.split(SCRIPT_RUNS[script]).map((run, i) =>
          i % 2 ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: runs are derived from the string and never reorder.
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

/**
 * Text in Onest. Size and colour come from the token classes, as on the web. It follows Dynamic Type
 * by the size it is set in, and `maxFontSizeMultiplier` can only lower that size's own cap. `lang` is
 * the BCP 47 tag of a card's own words, so a script Onest lacks draws in that script's face.
 */
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
  // iOS orders a right-to-left term from its tag, so one that opens with a Latin word still reads right;
  // it stays on the app's start edge, as a row expects, unless a block of it asks for `textStart`.
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

/** A state the design screen holds a control in, so each can be seen without a finger on it. */
export type ForcedState = "pressed" | "focused" | null;
export const ForcedStateContext = createContext<ForcedState>(null);

interface PressProps extends Omit<PressableProps, "style"> {
  /** How far a press gives, from motion.md: 0.97 buttons, 0.98 cards, 0.96 grades. */
  scale?: number;
  haptic?: boolean;
  className?: string;
  style?: ViewStyle | ViewStyle[];
  /** The drawn control's shorter side, when it is under 44 pt; the touch area grows to 44 around it. */
  drawn?: number;
}

/** Every control's touch area is at least this, whatever is drawn. phone.md "Components". */
export const TARGET = 44;

/** A press that gives a little over 150 ms and answers with a light tap. Nothing moves up. */
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

// Every control on the phone is 44 pt, so `md` is too; `sm` reaches 44 through its hit slop. `xl` is
// Today's one Review button alone; a stack of buttons, such as a review's end, takes `lg`.
const HEIGHT: Record<ButtonSize, string> = {
  sm: "h-8 px-3 rounded-sm",
  md: "h-11 px-4 rounded-md",
  lg: "h-12 px-5 rounded-md",
  xl: "h-16 px-5 rounded-md",
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
  /** A quiet fact after the label, such as how much a review still holds; centred with it. */
  detail?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** A mark that is not one of Lymi's icons, such as Google's G. */
  lead?: ReactNode;
  loading?: boolean;
  /** Its work is slow in coming and the label says so: a turning loader takes the icon's place, as on IconButton. */
  busy?: boolean;
  /** Pressing cannot do anything yet. It dims and swallows the press, and VoiceOver still finds it. */
  disabled?: boolean;
  /** A secondary with a stronger edge, for the way in most learners take (Google on sign-in). */
  strong?: boolean;
  onPress?: () => void;
  testID?: string;
}

/**
 * buttons.md: one primary per view, secondary by default. `lg` ends a flow such as sign-in,
 * `xl` is Today's Review. `loading` keeps the width, shows a spinner and swallows a press.
 */
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
      className={`flex-row items-center justify-center gap-2 ${box} ${HEIGHT[size]} ${disabled ? "opacity-45" : ""}`}
      style={variant === "primary" ? keyLight(p) : undefined}
    >
      <View className={`flex-row items-center gap-2 ${loading ? "opacity-0" : ""}`}>
        {lead}
        {icon &&
          (busy ? (
            <Turning>
              <Icon name="loading" colour={ink} size={ICON[size]} />
            </Turning>
          ) : (
            <Icon name={icon} colour={ink} size={ICON[size]} />
          ))}
        <Text className={`${LABEL[size]} font-medium`} style={{ color: ink }}>
          {label}
        </Text>
        {detail && (
          <Text
            className={`${LABEL[size]} opacity-70`}
            style={{
              color: variant === "secondary" ? p["ink-muted"] : ink,
              fontVariant: ["tabular-nums"],
            }}
          >
            {detail}
          </Text>
        )}
      </View>
      {loading && <ActivityIndicator color={ink} className="absolute" />}
    </Press>
  );
}

const ICON_BOX = { sm: "size-8", md: "size-11", lg: "size-12" } as const;
const ICON_GLYPH = { sm: 16, md: 20, lg: 22 } as const;

interface IconButtonProps {
  icon: IconName;
  /** What pressing does, never what the icon is: "Add card", not "Plus". */
  label: string;
  variant?: ButtonVariant;
  size?: keyof typeof ICON_BOX;
  /** A circle, for capture and the pronunciation button only. */
  round?: boolean;
  disabled?: boolean;
  /** Off where a screen answers with its own haptics, as the review does. */
  haptic?: boolean;
  /** Held down, it presses again and again, as a stepper's − and + do. */
  repeat?: boolean;
  /** Its work is slow in coming: a turning loader takes the icon's place, as on the web. */
  busy?: boolean;
  /** Draws a glyph that moves in the icon's place, in the button's ink, such as the playing speaker. */
  glyph?: (ink: string, size: number) => ReactNode;
  /** How far the touch area reaches past each side, where a miss costs more than the 44 pt default. */
  reach?: number;
  onPress?: () => void;
  testID?: string;
}

/** How often a held stepper button presses again. */
const REPEAT_MS = 90;

/** One icon whose meaning carries alone. Ghost by default; every size reaches a 44 pt target. */
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

/** Turns what it holds once a second, as the web's spinner does; under Reduce Motion it holds still. */
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

/** The one button to press: a soft fall of light along its top. surfaces.md "key-light". */
function keyLight(p: Palette): ViewStyle {
  return {
    experimental_backgroundImage: `linear-gradient(to bottom, ${p["key-sheen"]}, ${clear(p["key-sheen"])})`,
    boxShadow: `inset 0 1px 0 ${p["key-edge"]}, inset 0 0 0 1px ${p["key-rim"]}`,
  } as ViewStyle;
}

/** A plate: flat by day with one hairline, a little off the room at night on a soft shadow. */
export function Plate({
  className,
  style,
  children,
  ...props
}: ViewProps & { className?: string; children?: ReactNode }) {
  const dark = useRoom() === "dark";
  // On glass a plate lets the glass through, and nothing lifts off a surface that already floats.
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

/** The night's lift; by day surfaces stay flat. */
export const LIFT = { boxShadow: shadows.dark.lift } as ViewStyle;

/** A bare chevron: how a whole-row link ends; the row itself is the target. */
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
