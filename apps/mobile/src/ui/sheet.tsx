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

const ROW_INSET = 16;
const GroupMarked = createContext(true);
const SheetInset = createContext(ROW_INSET);

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
  back?: { label: string; onPress: () => void };
  save?: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean };
  children: ReactNode;
  more?: ReactNode;
}

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
  const top = save ? "pt-4" : "pt-7";
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
        <View>
          <Animated.ScrollView
            style={[{ width }, fits]}
            contentContainerClassName={`px-4 pb-4 ${top}`}
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
          <ScrollEdge side="top" colour={edge} before={scrolled} />
          <ScrollEdge side="bottom" colour={edge} before={left} />
        </View>
      )}
    </SheetFrame>
  );
}

const EDGE = 24;

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

export function SheetNote({ children }: { children: ReactNode }) {
  const inset = useContext(SheetInset);
  return (
    <Text className="-mt-1 text-sm text-ink-muted" style={{ paddingStart: inset }}>
      {children}
    </Text>
  );
}

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

const isMarked = (row: ReactNode) =>
  isValidElement<{ icon?: unknown; chosen?: unknown }>(row) &&
  (!!row.props.icon || row.props.chosen !== undefined);

export function SheetGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  const marked = rows.some(isMarked);
  return (
    <GroupMarked.Provider value={marked}>
      <View className="overflow-hidden rounded-xl bg-glass-group">
        {rows.map((row, i) => (
          // oxlint-disable-next-line react/no-array-index-key -- rows are given in order and never reorder
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
  icon?: IconName | undefined;
  detail?: string | undefined;
  destructive?: boolean | undefined;
  value?: string | undefined;
  chosen?: boolean | "mixed" | undefined;
  multiple?: boolean | undefined;
  opens?: boolean | undefined;
  active?: boolean | undefined;
  disabled?: boolean | undefined;
  onPress: () => void;
}

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
