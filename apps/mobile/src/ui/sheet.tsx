import { useLingui } from "@lingui/react/macro";
import {
  Children,
  createContext,
  Fragment,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../theme/haptics";
import { clear, usePalette, useRoom } from "../theme/palette";
import { GlassButton } from "./glass";
import { Icon, type IconName } from "./icons";
import { Text } from "./primitives";
import { SheetFrame } from "./sheet-frame";
import { OnGlass } from "./surface";

// A sheet that rises over the screen, presented by iOS so it is Liquid Glass, follows the finger
// and swipes away; what is inside is Lymi's. phone.md "Sheets".

/**
 * Where a sheet's own text starts: 16 pt in from a plate's edge, where a row's icon or check starts,
 * as iOS sets a grouped list's headers. One line for headings and notes.
 */
const ROW_INSET = 16;
/** Whether this group's rows keep the slot: only when one of them shows an icon or a check. */
const GroupMarked = createContext(true);
/** Where the sheet's own text starts: every heading and note. */
const SheetInset = createContext(ROW_INSET);

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** After the sheet has gone, so what a row chose can run without moving anything under it. */
  onDismiss?: () => void;
  /**
   * What the sheet is about, centred at its top, between close and ✓ when it saves. A sheet without
   * one, such as a row's commands or a peek led by its own content, has no header; what a learner
   * needs to know before acting goes in a `SheetNote` under the rows it is about.
   */
  title?: string;
  /** A short line centred under the title, such as how many cards the drafted filters keep. */
  subtitle?: string;
  /**
   * A short line centred under the title, two lines at most in every language, only for what the rows can't say: what
   * the choice changes, a rule behind it, or why the sheet can't act while offline. Never how to
   * use the rows.
   */
  description?: string;
  /** A level below the sheet's first: a back chevron takes close's place, named by `label`. */
  back?: { label: string; onPress: () => void };
  /**
   * Close at the header's start and an amber ✓ at its end, for a sheet that holds something to
   * save: a form, or a list ticked several at a time. Close and a swipe leave without saving. A
   * sheet that saves nothing, such as a list where a tap is the choice, has neither: its title alone,
   * and a swipe or the tap closes it.
   */
  save?: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean };
  /** What shows first; the sheet opens at its height. */
  children: ReactNode;
  /**
   * More of the same, under the fold: dragging the sheet up opens it to the full screen, where
   * iOS turns the glass opaque, as the dev menu does.
   */
  more?: ReactNode;
}

/** A glass sheet sized to what it holds, with Lymi's groups and rows inside. */
export function Sheet({
  open,
  onOpenChange,
  onDismiss,
  title,
  subtitle,
  description,
  back,
  save,
  children,
  more,
}: SheetProps) {
  const { t } = useLingui();
  const room = useRoom();
  const p = usePalette();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // iOS lifts the sheet over a keyboard its field brings up, so the sheet gives up that room frame by
  // frame as the keyboard rises; whatever no longer fits scrolls.
  const { height: keyboard } = useReanimatedKeyboardAnimation();
  const tallest = height - insets.top - 16;
  const fits = useAnimatedStyle(() => ({ maxHeight: tallest + keyboard.value }));
  const [peek, setPeek] = useState<number | null>(null);
  const inset = ROW_INSET;
  const name = (
    <View className="flex-1 items-center">
      <Text
        className="text-center text-md font-medium text-ink"
        accessibilityRole="header"
        numberOfLines={1}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className="text-center text-sm text-ink-muted"
          style={{ fontVariant: ["tabular-nums"] }}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
  const heading =
    title === undefined ? null : save ? (
      <View className="flex-row items-center gap-3">
        {back ? (
          <GlassButton icon="back" label={back.label} onPress={back.onPress} />
        ) : (
          <GlassButton icon="close" label={t`Cancel`} onPress={() => onOpenChange(false)} />
        )}
        {name}
        <GlassButton
          icon="check"
          label={save.label}
          primary
          disabled={save.disabled}
          busy={save.busy}
          onPress={save.onPress}
        />
      </View>
    ) : (
      <View className="flex-row">{name}</View>
    );
  // Room under the header, so the first group never crowds the title.
  const header = heading && (
    <View className="gap-1.5 pb-5">
      {heading}
      {description && (
        <Text className="px-6 text-center text-base text-ink-muted">{description}</Text>
      )}
    </View>
  );
  const first = (
    <SheetInset.Provider value={inset}>
      <OnGlass>
        {header}
        <View className="gap-3">{children}</View>
      </OnGlass>
    </SheetInset.Provider>
  );
  // Glass buttons sit higher than a lone title, as on every form.
  const top = save ? "pt-4" : "pt-7";
  // Only a sheet with more to scroll softens its edges, and only on the side where more is.
  const offset = useSharedValue(0);
  const shown = useSharedValue(0);
  const whole = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    offset.value = e.contentOffset.y;
  });
  const scrolled = offset;
  const left = useDerivedValue(() => whole.value - shown.value - offset.value);
  const edge = room === "dark" ? p.sheet : p.plate;
  return (
    <SheetFrame
      open={open}
      onOpenChange={onOpenChange}
      onDismiss={() => onDismiss?.()}
      expands={!!more}
      peek={peek}
    >
      {more ? (
        // Fills the sheet rather than sizing to its rows, so its top shows when it peeks and the
        // rest scrolls once it is dragged up to the full screen.
        <ScrollView
          style={{ width }}
          contentContainerClassName={`px-4 pb-8 ${top}`}
          keyboardShouldPersistTaps="handled"
        >
          <View onLayout={(e) => setPeek(e.nativeEvent.layout.height + 56)}>{first}</View>
          <View className="gap-3 pt-3">
            <SheetInset.Provider value={inset}>
              <OnGlass>{more}</OnGlass>
            </SheetInset.Provider>
          </View>
        </ScrollView>
      ) : (
        // A list taller than the screen, such as every language, scrolls inside the sheet.
        <View>
          <Animated.ScrollView
            style={[{ width }, fits]}
            contentContainerClassName={`px-4 pb-4 ${top}`}
            // A row or Save takes the first tap, even with the keyboard up.
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
            onLayout={(e) => {
              shown.value = e.nativeEvent.layout.height;
            }}
            onContentSizeChange={(_, h) => {
              whole.value = h;
            }}
          >
            {first}
          </Animated.ScrollView>
          {/* At full height iOS turns the glass opaque, white by day and the room's sheet at night. */}
          <ScrollEdge side="top" colour={edge} before={scrolled} />
          <ScrollEdge side="bottom" colour={edge} before={left} />
        </View>
      )}
    </SheetFrame>
  );
}

const EDGE = 24;

/** A soft edge over a sheet's scroll, shown as `before` (the content past that edge) grows. */
function ScrollEdge({
  side,
  colour,
  before,
}: {
  side: "top" | "bottom";
  colour: string;
  before: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(before.value, [0, EDGE], [0, 1], Extrapolation.CLAMP),
  }));
  const to = side === "top" ? "bottom" : "top";
  return (
    <Animated.View
      pointerEvents="none"
      className={`absolute inset-x-0 ${side === "top" ? "top-0" : "bottom-0"}`}
      style={[
        {
          height: EDGE,
          experimental_backgroundImage: `linear-gradient(to ${to}, ${colour}, ${clear(colour)})`,
        } as ViewStyle,
        style,
      ]}
    />
  );
}

/** A name over a group, on the sheet's text line. */
export function SheetHeading({ children }: { children: string }) {
  const inset = useContext(SheetInset);
  return (
    <Text
      className="-mb-1 pt-2 text-md font-semibold text-ink"
      style={{ paddingStart: inset }}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

/** A line under a group that says more about it, on the sheet's text line. */
export function SheetNote({ children }: { children: ReactNode }) {
  const inset = useContext(SheetInset);
  return (
    <Text className="-mt-1 text-sm text-ink-muted" style={{ paddingStart: inset }}>
      {children}
    </Text>
  );
}

/** An error in a sheet, on the sheet's text line and read out as it appears: iOS ignores accessibilityLiveRegion, so it is announced there. */
export function SheetError({ children }: { children: string }) {
  const inset = useContext(SheetInset);
  useEffect(() => {
    if (Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(children);
  }, [children]);
  return (
    <Text
      className="text-base text-danger"
      style={{ paddingStart: inset }}
      accessibilityLiveRegion="polite"
    >
      {children}
    </Text>
  );
}

/** A row keeps the mark slot when it has an icon or is a choice. */
const isMarked = (row: ReactNode) =>
  isValidElement<{ icon?: unknown; chosen?: unknown }>(row) &&
  (!!row.props.icon || row.props.chosen !== undefined);

/**
 * Rows that belong together, on one plate inset from the sheet's edge, split by full-width
 * hairlines, as every plate in Lymi is. A sheet's groups sit 12 pt apart.
 */
export function SheetGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  const marked = rows.some(isMarked);
  return (
    <GroupMarked.Provider value={marked}>
      <View className="overflow-hidden rounded-xl bg-glass-group">
        {rows.map((row, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are given in order and never reorder
          <Fragment key={i}>
            {i > 0 && <View className="h-px bg-edge" />}
            {row}
          </Fragment>
        ))}
      </View>
    </GroupMarked.Provider>
  );
}

interface SheetRowProps {
  label: string;
  /** A Lucide icon in the slot the group's rows keep once any of them has a mark, so labels line up. */
  icon?: IconName | undefined;
  /** A line under the label, such as what a setting is now. */
  detail?: string | undefined;
  /** Archive, Remove or Leave: red. */
  destructive?: boolean | undefined;
  /** A short figure at the row's end, such as how many cards a filter keeps. */
  value?: string | undefined;
  /** In a choice list: whether this is the current one, marked with a check; mixed, a dash, is on some of what it applies to. */
  chosen?: boolean | "mixed" | undefined;
  /** One of several that can be chosen together: a checkbox rather than a radio. */
  multiple?: boolean | undefined;
  /** Opens more, so it ends in a chevron. */
  opens?: boolean | undefined;
  /** The match Return takes in a searched list, lit as a pressed row is. */
  active?: boolean | undefined;
  /** Needs what the phone lacks now, such as a connection; the detail says what. */
  disabled?: boolean | undefined;
  onPress: () => void;
}

/** One row of a sheet: 52 pt, Lymi's icon and type, red when it removes something. */
export function SheetRow({
  label,
  icon,
  detail,
  value,
  destructive = false,
  chosen,
  multiple = false,
  opens = false,
  active = false,
  disabled = false,
  onPress,
}: SheetRowProps) {
  const p = usePalette();
  const slot = useContext(GroupMarked);
  const ink = disabled ? p["ink-muted"] : destructive ? p.danger : p.ink;
  const mark =
    chosen === undefined
      ? icon && (
          <Icon
            name={icon}
            size={20}
            colour={disabled ? p["ink-faint"] : destructive ? p.danger : p["ink-secondary"]}
          />
        )
      : chosen && (
          <Icon
            name={chosen === "mixed" ? "minus" : "check"}
            size={20}
            colour={p.ink}
            strokeWidth={2.25}
          />
        );
  return (
    <Pressable
      onPress={() => {
        haptics.tick();
        onPress();
      }}
      accessibilityRole={chosen === undefined ? "menuitem" : multiple ? "checkbox" : "radio"}
      accessibilityState={chosen === undefined ? { disabled } : { checked: chosen, disabled }}
      disabled={disabled}
      className="min-h-[52px] flex-row items-center gap-3 ps-4 pe-3.5"
      style={({ pressed }) => (pressed || active ? { backgroundColor: p["plate-hover"] } : null)}
    >
      {slot && <View className="w-5 items-center">{mark}</View>}
      <View className="flex-1 gap-0.5 py-2.5">
        <Text
          className={`text-md ${chosen ? "font-medium" : ""}`}
          style={{ color: ink }}
          numberOfLines={2}
        >
          {label}
        </Text>
        {detail && <Text className="text-sm text-ink-muted">{detail}</Text>}
      </View>
      {value !== undefined && (
        <Text className="text-md text-ink-muted" style={{ fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
      )}
      {opens && <Icon name="forward" size={18} colour={p["ink-muted"]} />}
    </Pressable>
  );
}
