import { useLingui } from "@lingui/react/macro";
import { unisolate } from "@lymi/core";
import { BlurView } from "expo-blur";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BackHandler,
  I18nManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { usePalette, useShadows } from "../theme/palette";
import { useBlurTarget } from "./blur-target";
import { Icon, type IconName } from "./icons";
import type { MenuItem } from "./menu";
import { Overlay } from "./overlay";
import { Press, Text } from "./primitives";
import { BarButton } from "./screen";

// Android's counterpart of action-menu.tsx, drawn by Lymi as the web's frosted dropdown since Material's takes neither Onest nor Lucide; phone.md "Menus".

const TRIGGERS = { ellipsis: "more", plus: "plus" } as const satisfies Record<string, IconName>;
/** The web's menu: at least 12rem wide, with the screen's 16 pt kept clear around it. */
const MIN_WIDTH = 192;
const MAX_WIDTH = 288;
const MARGIN = 16;
const GAP = 6;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
/** The web glass's 12 px blur, as expo-blur's intensity, which Android divides by four. */
const BLUR = 48;

interface ActionMenuProps {
  label: string;
  symbol: keyof typeof TRIGGERS;
  look?: "bar" | "primary" | "row";
  items: MenuItem[] | MenuItem[][];
  disabled?: boolean;
}

type Anchor = { x: number; y: number; w: number; h: number };
type Open = {
  owner: object;
  at: Anchor;
  items: MenuItem[] | MenuItem[][];
  onClosed: () => void;
};

// The one open menu, drawn by MenuHost at the root, so it sits over every screen in their window.
let open: Open | null = null;
const listeners = new Set<() => void>();
const setOpen = (next: Open | null) => {
  if (open && open.owner !== next?.owner) open.onClosed();
  open = next;
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function ActionMenu({
  label,
  symbol,
  look = "bar",
  items,
  disabled = false,
}: ActionMenuProps) {
  const p = usePalette();
  const anchor = useRef<View>(null);
  const [expanded, setExpanded] = useState(false);
  const owner = useRef({}).current;
  const icon = TRIGGERS[symbol];
  const show = () =>
    anchor.current?.measureInWindow((x, y, w, h) => {
      setExpanded(true);
      setOpen({ owner, at: { x, y, w, h }, items, onClosed: () => setExpanded(false) });
    });
  // A menu whose button goes, with its screen, goes too; another button's stays.
  useEffect(
    () => () => {
      if (open?.owner === owner) setOpen(null);
    },
    [owner],
  );
  return (
    <>
      <View ref={anchor} collapsable={false}>
        {look === "row" ? (
          <Pressable
            onPress={show}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={unisolate(label)}
            accessibilityState={{ disabled, expanded }}
            hitSlop={8}
            style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={icon} size={18} colour={p.muted} />
          </Pressable>
        ) : (
          // The bar's own button, so it matches the search and streak beside it.
          <BarButton
            icon={icon}
            label={label}
            amber={look === "primary"}
            onPress={disabled ? undefined : show}
          />
        )}
      </View>
    </>
  );
}

/** Draws the open menu over every screen; the root layout holds one. */
export function MenuHost() {
  const menu = useSyncExternalStore(subscribe, () => open);
  if (!menu) return null;
  return (
    <Overlay>
      <Popover at={menu.at} items={menu.items} onClose={() => setOpen(null)} />
    </Overlay>
  );
}

function Popover({
  at,
  items,
  onClose,
}: {
  at: Anchor;
  items: MenuItem[] | MenuItem[][];
  onClose: () => void;
}) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
  const drop = useShadows()["glass-drop"];
  // Grows from 0.94 over 140 ms and fades out over 100 ms, as the web's menu does; Reduce Motion only fades.
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(1, { duration: 140, easing: EASE, reduceMotion: ALWAYS });
  }, [shown]);
  const grow = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: reduce ? 1 : 0.94 + 0.06 * shown.value }],
  }));
  // One close runs once, however many taps or Backs ask for it during the fade.
  const leaving = useRef(false);
  const leave = (then?: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    const gone = () => {
      onClose();
      then?.();
    };
    shown.value = withTiming(0, { duration: 100, reduceMotion: ALWAYS }, (done) => {
      if (done) scheduleOnRN(gone);
    });
  };
  // Back closes the menu before it reaches the screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: it binds once, for as long as the menu is open.
  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      leave();
      return true;
    });
    return () => back.remove();
  }, []);
  const p = usePalette();
  const target = useBlurTarget();
  // Blur from Android 12; before it, the plate the web falls back to.
  const frosted = !!target && Number(Platform.Version) >= 31;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const groups = (Array.isArray(items[0]) ? items : [items]) as MenuItem[][];
  const rtl = I18nManager.isRTL;
  // Hangs from the button, or rises from it when the button sits low on the screen; it opens toward
  // the side with room, lined up with the button's end edge, or its start edge from the start half.
  const below = at.y + at.h / 2 < height / 2;
  const fromStart = (rtl ? width - (at.x + at.w / 2) : at.x + at.w / 2) < width / 2;
  const side = fromStart
    ? { start: Math.max(MARGIN, rtl ? width - (at.x + at.w) : at.x) }
    : { end: Math.max(MARGIN, rtl ? at.x : width - (at.x + at.w)) };
  const corner = fromStart === rtl ? "right" : "left";
  const place: ViewStyle = below
    ? { top: at.y + at.h + GAP, maxHeight: height - (at.y + at.h + GAP) - insets.bottom - MARGIN }
    : { bottom: height - at.y + GAP, maxHeight: at.y - GAP - insets.top - MARGIN };
  const choose = (item: MenuItem) => leave(item.onSelect);
  return (
    <>
      <Pressable
        className="flex-1"
        onPress={() => leave()}
        accessibilityRole="button"
        accessibilityLabel={t`Close`}
      />
      <Animated.View
        accessibilityRole="menu"
        className="absolute overflow-hidden rounded-md"
        style={[
          place,
          {
            ...side,
            minWidth: MIN_WIDTH,
            maxWidth: Math.min(MAX_WIDTH, width - 2 * MARGIN),
            transformOrigin: `${corner} ${below ? "top" : "bottom"}`,
            // The web's glass: a sheen along the top, a hairline ring and a soft drop.
            boxShadow: `inset 0 1px 0 ${p["glass-sheen"]}, 0 0 0 1px ${p["edge-2"]}, ${drop}`,
            backgroundColor: frosted ? undefined : p.plate,
          },
          grow,
        ]}
      >
        {frosted && (
          <>
            <BlurView
              blurTarget={target}
              blurMethod="dimezisBlurViewSdk31Plus"
              intensity={BLUR}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: p["glass-fill"] }]} />
          </>
        )}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-1">
          {groups.map((group, g) => (
            <Fragment key={group.map((i) => i.label).join()}>
              {g > 0 && <View className="-mx-1 my-1 h-px bg-edge" />}
              {group.map((item) => (
                <MenuRow key={item.label} item={item} onPress={() => choose(item)} />
              ))}
            </Fragment>
          ))}
        </ScrollView>
      </Animated.View>
    </>
  );
}

/** One command: 48 dp for a finger, the icon iOS's menu shows, and red for a removal. */
function MenuRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      className="min-h-12 flex-row items-center gap-3 rounded-sm ps-3 pe-4"
      style={({ pressed }) => (pressed ? { backgroundColor: p.hover } : null)}
    >
      {item.icon && (
        <Icon name={item.icon} size={20} colour={item.destructive ? p.danger : p["text-2"]} />
      )}
      <Text
        className="shrink text-md"
        style={{ color: item.destructive ? p.danger : p.text }}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}
