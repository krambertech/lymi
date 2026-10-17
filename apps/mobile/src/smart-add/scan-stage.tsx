import { CHOICE_POP, EASE_OUT } from "@lymi/design";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image, View, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { ALWAYS, curve, springIn, useReduceMotion } from "../theme/motion";
import { clear, usePalette } from "../theme/palette";
import { Icon, Text } from "../ui/primitives";
import type { Page } from "./material";
import { Swap } from "./swap";

// The lesson under a lamp, as on the web (smart-add-scan.tsx): a light passes over the top page, and
// when it moves on, the top page slides out to the side and tucks under the rest.

const PAGE_W = 168;
const PAGE_H = 224;
/** How long the old top page stays out to the side before it tucks under. */
const OUT_MS = 380;
const POSES = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: 18, y: 6, rotate: 7, scale: 0.95 },
  { x: -18, y: 8, rotate: -7, scale: 0.92 },
];
const OUT = { x: PAGE_W * 0.7, y: -4, rotate: 9, scale: 0.98 };
const LIGHT_H = PAGE_H * 0.44;

interface ScanStageProps {
  pages: Page[];
  text: string;
  finished: boolean;
  /** The page under the light. */
  current: number;
}

export function ScanStage({ pages, text, finished, current }: ScanStageProps) {
  const reduce = useReduceMotion();
  const previous = useRef(current);
  const [outside, setOutside] = useState(-1);
  useLayoutEffect(() => {
    if (previous.current === current) return;
    setOutside(previous.current);
    previous.current = current;
    const back = setTimeout(() => setOutside(-1), OUT_MS);
    return () => clearTimeout(back);
  }, [current]);

  const sheets = pages.length > 0 ? pages : [null];
  const n = sheets.length;
  return (
    <View style={{ width: PAGE_W, height: PAGE_H }} accessibilityElementsHidden>
      {sheets.map((sheet, i) => {
        const depth = (i - current + n) % n;
        const out = i === outside && !reduce;
        return (
          <Sheet
            key={sheet?.id ?? "text"}
            pose={out ? OUT : (POSES[Math.min(depth, POSES.length - 1)] ?? OUT)}
            shown={depth < POSES.length}
            z={out ? n + 1 : n - depth}
            out={out}
            reduce={reduce}
          >
            <Face page={sheet} text={text} />
          </Sheet>
        );
      })}
      <View
        pointerEvents="none"
        className="absolute overflow-hidden rounded-lg"
        style={{ top: 6, bottom: 6, start: 6, end: 6, zIndex: n + 2 }}
      >
        {!finished && !reduce && <Light />}
      </View>
      {finished && <Done z={n + 3} reduce={reduce} />}
    </View>
  );
}

function Sheet({
  pose,
  shown,
  z,
  out,
  reduce,
  children,
}: {
  pose: (typeof POSES)[number];
  shown: boolean;
  z: number;
  out: boolean;
  reduce: boolean;
  children: React.ReactNode;
}) {
  const x = useSharedValue(pose.x);
  const y = useSharedValue(pose.y);
  const rotate = useSharedValue(pose.rotate);
  const scale = useSharedValue(pose.scale);
  const opacity = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    const how = {
      duration: reduce ? 0 : out ? OUT_MS : 550,
      easing: curve(EASE_OUT),
      reduceMotion: ALWAYS,
    };
    x.value = withTiming(pose.x, how);
    y.value = withTiming(pose.y, how);
    rotate.value = withTiming(pose.rotate, how);
    scale.value = withTiming(pose.scale, how);
    opacity.value = withTiming(shown ? 1 : 0, how);
  }, [pose, shown, out, reduce, x, y, rotate, scale, opacity]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));
  return (
    <Animated.View
      className="absolute inset-0 rounded-xl border border-edge bg-plate"
      // Padding in the style: the half-step class did not apply on this animated view.
      style={[{ zIndex: z, padding: 6 }, style]}
    >
      {children}
    </Animated.View>
  );
}

function Face({ page, text }: { page: Page | null; text: string }) {
  const p = usePalette();
  if (page?.kind === "photo")
    return (
      <Image
        source={{ uri: page.uri }}
        className="flex-1 rounded-lg"
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    );
  if (page)
    return (
      <View className="flex-1 items-center justify-center gap-1.5 rounded-lg bg-plate-2 px-2">
        <Icon name="lesson" size={28} colour={p.muted} />
        <Text className="text-xs text-muted" numberOfLines={1}>
          {page.name}
        </Text>
      </View>
    );
  return (
    <View className="flex-1 overflow-hidden rounded-lg bg-plate-2" style={{ padding: 12 }}>
      <Text
        className="text-text-2"
        style={{ fontSize: 9, lineHeight: 13 }}
        maxFontSizeMultiplier={1}
      >
        {text.slice(0, 900)}
      </Text>
    </View>
  );
}

/** A pool of amber light with a bright line through it, passing down the page and back. */
function Light() {
  const p = usePalette();
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, {
        duration: 3400,
        easing: Easing.bezier(0.45, 0, 0.55, 1),
        reduceMotion: ALWAYS,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(sweep);
  }, [sweep]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * PAGE_H - PAGE_H * 0.22 }],
  }));
  const tint = p["amber-tint"];
  return (
    <Animated.View
      exiting={FadeOut.duration(400).reduceMotion(ALWAYS)}
      className="absolute inset-x-0 top-0"
      style={[{ height: LIGHT_H }, style]}
    >
      <View
        className="flex-1"
        style={
          {
            experimental_backgroundImage: `linear-gradient(to bottom, ${clear(tint)}, ${tint}, ${clear(tint)})`,
          } as ViewStyle
        }
      />
      <View
        className="absolute inset-x-3 top-1/2 h-px"
        style={{ backgroundColor: p.amber, boxShadow: `0 0 10px 2px ${p.glow}` }}
      />
    </Animated.View>
  );
}

function Done({ z, reduce }: { z: number; reduce: boolean }) {
  const p = usePalette();
  return (
    <Animated.View
      entering={reduce ? undefined : springIn(new ZoomIn(), CHOICE_POP)}
      className="absolute size-7 items-center justify-center rounded-full bg-good"
      style={{ top: -10, end: -10, zIndex: z }}
    >
      <Icon name="check" size={16} colour={p.canvas} strokeWidth={2.5} />
    </Animated.View>
  );
}

const ROLL_H = 44;

/** A number that rolls up to its new value; under Reduce Motion it changes in place. */
export function RollingCount({ value }: { value: number }) {
  return (
    <Swap id={value} height={ROLL_H} distance={ROLL_H} duration={360}>
      <Text
        className="font-medium text-text"
        style={{ fontSize: 36, lineHeight: ROLL_H, fontVariant: ["tabular-nums"] }}
        maxFontSizeMultiplier={1.2}
      >
        {String(value)}
      </Text>
    </Swap>
  );
}
