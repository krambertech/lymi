import { useLingui } from "@lingui/react/macro";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  useWindowDimensions,
  View,
  type ViewStyle,
  type View as ViewType,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { usePalette, useShadows } from "../theme/palette";
import { GlassSurface } from "./glass";
import { Icon } from "./icons";
import type { MenuItem } from "./menu";
import { Press, Text } from "./primitives";

const BUTTON = 40;
const WIDTH = 236;
const ROW = 50;
const PAD = 6;
const OPEN = { duration: 420, dampingRatio: 0.82, reduceMotion: ALWAYS };
const SHUT = { duration: 240, easing: Easing.bezier(0.3, 0, 0.2, 1), reduceMotion: ALWAYS };

/**
 * The tab's amber plus, which grows into a small menu of Lymi's rows where it stands, as iOS 26's
 * own menus grow out of their button; closing shrinks it back. Under Reduce Motion it fades.
 * A choice runs once the menu has shrunk, so nothing moves under it.
 */
export function MorphMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const { t } = useLingui();
  const p = usePalette();
  const shadows = useShadows();
  const reduce = useReduceMotion();
  const button = useRef<ViewType>(null);
  const [frame, setFrame] = useState<{ x: number; y: number } | null>(null);
  const chosen = useRef<(() => void) | null>(null);
  const k = useSharedValue(0);
  const height = PAD * 2 + items.length * ROW;
  const { width: screen } = useWindowDimensions();

  const open = () => {
    button.current?.measureInWindow((x, y, w) => {
      setFrame({ x: x + w, y });
      k.value = reduce ? withTiming(1, { duration: 160 }) : withSpring(1, OPEN);
    });
  };
  const closed = () => {
    setFrame(null);
    chosen.current?.();
    chosen.current = null;
  };
  const close = (then?: () => void) => {
    chosen.current = then ?? null;
    const ms = reduce ? 140 : SHUT.duration;
    k.value = withTiming(0, reduce ? { duration: ms } : SHUT);
    // The modal leaves once the panel is back in the button; a JS timer, so a choice never waits on the UI thread.
    setTimeout(closed, ms + 30);
  };

  const panel = useAnimatedStyle(() => {
    const w = reduce ? WIDTH : interpolate(k.value, [0, 1], [BUTTON, WIDTH]);
    const h = reduce ? height : interpolate(k.value, [0, 1], [BUTTON, height]);
    return {
      width: w,
      height: h,
      borderRadius: interpolate(k.value, [0, 1], [BUTTON / 2, 26]),
      opacity: reduce ? k.value : interpolate(k.value, [0, 0.15], [0, 1], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(k.value, [0, 0.55], [p.amber, p.sheet]),
    };
  });
  const rows = useAnimatedStyle(() => ({
    opacity: interpolate(k.value, [0.45, 0.9], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(k.value, [0.45, 1], [0.94, 1], Extrapolation.CLAMP) }],
  }));
  const veil = useAnimatedStyle(() => ({ opacity: k.value }));

  return (
    <>
      {/* The panel grows from the button itself, so the button steps out while it is open. */}
      <View ref={button} collapsable={false} style={{ opacity: frame ? 0 : 1 }}>
        <Press onPress={open} accessibilityRole="button" accessibilityLabel={label}>
          <GlassSurface
            tint="amber"
            style={{
              width: BUTTON,
              height: BUTTON,
              borderRadius: BUTTON / 2,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="plus" size={20} colour={p["amber-ink"]} strokeWidth={2.25} />
          </GlassSurface>
        </Press>
      </View>
      <Modal transparent visible={!!frame} animationType="none" onRequestClose={() => close()}>
        <Pressable
          className="absolute inset-0"
          onPress={() => close()}
          accessibilityRole="button"
          accessibilityLabel={t`Close menu`}
        >
          <Animated.View className="absolute inset-0 bg-black/10" style={veil} />
        </Pressable>
        {frame && (
          <Animated.View
            accessibilityViewIsModal
            style={[
              {
                position: "absolute",
                top: frame.y,
                // Anchored at the button's end edge, so it grows toward the screen's middle.
                right: screen - frame.x,
                overflow: "hidden",
                boxShadow: shadows.lift,
              } as ViewStyle,
              panel,
            ]}
          >
            <Animated.View style={[{ padding: PAD, width: WIDTH }, rows]}>
              {items.map((item) => (
                <Press
                  key={item.label}
                  scale={0.98}
                  onPress={() => close(item.onSelect)}
                  accessibilityRole="menuitem"
                  className="flex-row items-center gap-3 rounded-2xl px-3.5"
                  style={{ height: ROW }}
                >
                  {item.icon && (
                    <Icon
                      name={item.icon}
                      size={20}
                      colour={item.destructive ? p.danger : p["text-2"]}
                    />
                  )}
                  <Text
                    className="text-md"
                    style={{ color: item.destructive ? p.danger : p.text }}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Press>
              ))}
            </Animated.View>
          </Animated.View>
        )}
      </Modal>
    </>
  );
}
