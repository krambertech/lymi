import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { usePalette } from "../theme/palette";
import {
  BAIL,
  EMBER,
  FLAME_CORE,
  FLAME_OUTER,
  FLAME_SIZE,
  FLAME_SPARKS,
  FRAME,
  flameSize,
  GLASS,
  VENT,
} from "./geometry";

// The springs from apps/web lib/flame.ts, as Reanimated configs.
const SPRING = {
  settle: { duration: 900, dampingRatio: 1 },
  rise: { duration: 1400, dampingRatio: 1 },
  catch: { duration: 700, dampingRatio: 0.75 },
  goOut: { duration: 1600, dampingRatio: 1 },
  breathIn: { duration: 280, dampingRatio: 1 },
  breathOut: { duration: 900, dampingRatio: 1 },
} as const;

const LOOP = 2600;

interface Props {
  size: number;
  /** Today's accepted reviews over the goal. Omit for the brand lantern. */
  progress?: number | undefined;
  out?: boolean | undefined;
  /** Bump by one per accepted review: a breath and a spark. */
  fed?: number | undefined;
  flicker?: boolean | undefined;
  glow?: boolean | undefined;
  style?: ViewStyle | undefined;
}

/** The storm lantern, drawn in three layers so the flame can move under the frame on the UI thread. */
export function Lantern({
  size,
  progress,
  out = false,
  fed = 0,
  flicker = true,
  glow = true,
  style,
}: Props) {
  const p = usePalette();
  const reduce = useReducedMotion();
  const target = flameSize(progress, out);
  const flame = useSharedValue(target);
  const breath = useSharedValue(0);
  const flick = useSharedValue(0);
  const lastFed = useRef(fed);

  useEffect(() => {
    if (reduce) {
      flame.value = target;
      return;
    }
    const was = flame.value;
    const spring =
      target === FLAME_SIZE.out
        ? SPRING.goOut
        : was < 0.3
          ? SPRING.catch
          : target === FLAME_SIZE.full && was < FLAME_SIZE.full
            ? SPRING.rise
            : SPRING.settle;
    flame.value = withSpring(target, spring);
    if (target === FLAME_SIZE.full && was < FLAME_SIZE.full && was >= 0.3)
      breath.value = withSequence(
        withSpring(1.6, SPRING.breathIn),
        withSpring(0, SPRING.breathOut),
      );
  }, [target, reduce, flame, breath]);

  useEffect(() => {
    if (fed === lastFed.current) return;
    lastFed.current = fed;
    if (reduce || out) return;
    breath.value = withSequence(withSpring(1, SPRING.breathIn), withSpring(0, SPRING.breathOut));
  }, [fed, out, reduce, breath]);

  useEffect(() => {
    if (!flicker || reduce) {
      flick.value = 0;
      return;
    }
    flick.value = withRepeat(withTiming(1, { duration: LOOP, easing: Easing.linear }), -1);
  }, [flicker, reduce, flick]);

  const flameStyle = useAnimatedStyle(() => {
    const t = flick.value;
    // The web keyframes: 0 → 30% → 55% → 80% → 100%.
    const fy = interpolate(t, [0, 0.3, 0.55, 0.8, 1], [1, 1.07, 0.965, 1.05, 1]);
    const fx = interpolate(t, [0, 0.3, 0.55, 0.8, 1], [1, 0.97, 1.03, 0.98, 1]);
    const s = flame.value;
    return {
      opacity: interpolate(s, [0, 0.3], [0, 1], "clamp"),
      transform: [
        { scaleX: (1 + (s - 1) * 0.5 - breath.value * 0.02) * fx },
        { scaleY: (s + breath.value * 0.08) * fy },
      ],
    };
  });

  const coreStyle = useAnimatedStyle(() => {
    const t = flick.value;
    return {
      transform: [
        { scaleX: interpolate(t, [0, 0.35, 0.7, 1], [1, 0.93, 1.06, 1]) },
        { scaleY: interpolate(t, [0, 0.35, 0.7, 1], [1, 1.12, 0.94, 1]) },
      ],
    };
  });

  const emberStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flame.value, [0, 0.3], [1, 0], "clamp"),
  }));
  const unlitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flame.value, [0, 0.5], [1, 0], "clamp"),
  }));

  const haloStyle = useAnimatedStyle(() => {
    const level = interpolate(
      flame.value,
      [0, FLAME_SIZE.start, 1, FLAME_SIZE.full],
      [0, 0.7, 1, 1.7],
    );
    const pulse = interpolate(flick.value, [0, 0.3, 0.62, 1], [1, 1.12, 0.94, 1]);
    const k = (level + breath.value * 0.45) * pulse;
    return { opacity: Math.min(1, k), transform: [{ scale: 0.55 + k * 0.45 }] };
  });

  const box = { width: size, height: size };
  // The flame grows from its own base, not from the middle of the drawing.
  const flameOrigin = { transformOrigin: [size / 2, (size * 96.5) / 120, 0] };
  const coreOrigin = { transformOrigin: [size / 2, (size * 90.5) / 120, 0] };

  return (
    <View style={[box, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Path d={BAIL} stroke={p.metal} strokeWidth={5.5} strokeLinecap="round" fill="none" />
        <Rect
          x={GLASS.x}
          y={GLASS.y}
          width={GLASS.w}
          height={GLASS.h}
          rx={GLASS.r}
          fill={p.glass}
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, unlitStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Rect
            x={GLASS.x}
            y={GLASS.y}
            width={GLASS.w}
            height={GLASS.h}
            rx={GLASS.r}
            fill={p["glass-unlit"]}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, emberStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Path d={EMBER} fill={p["edge-2"]} />
        </Svg>
      </Animated.View>
      {glow && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            haloStyle,
            { transformOrigin: [size / 2, (size * 80) / 120, 0] },
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 120 120" style={styles.overflow}>
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
                <Stop offset="0" stopColor={p.amber} stopOpacity={0.75} />
                <Stop offset="0.5" stopColor={p.amber} stopOpacity={0.25} />
                <Stop offset="1" stopColor={p.amber} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="60" cy="80" r="26" fill="url(#halo)" />
          </Svg>
        </Animated.View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, flameOrigin, flameStyle]}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Path d={FLAME_OUTER} fill={p.amber} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, coreOrigin, coreStyle]}>
          <Svg width={size} height={size} viewBox="0 0 120 120">
            <Path d={FLAME_CORE} fill={p["flame-core"]} />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        {FRAME.map((s) =>
          s.d ? (
            <Path
              key={s.d}
              d={s.d}
              fill={p.metal}
              stroke={p.metal}
              strokeWidth={s.strokeWidth}
              strokeLinejoin="round"
            />
          ) : (
            <Rect
              key={`${s.x}-${s.y}`}
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={s.r}
              fill={p.metal}
            />
          ),
        )}
      </Svg>
      <Sparks fed={fed} out={out} size={size} colour={p.amber} />
    </View>
  );
}

function Sparks({
  fed,
  out,
  size,
  colour,
}: {
  fed: number;
  out: boolean;
  size: number;
  colour: string;
}) {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<number[]>([]);
  const lastFed = useRef(fed);
  const nextId = useRef(0);

  useEffect(() => {
    if (fed === lastFed.current) return;
    lastFed.current = fed;
    if (reduce || out) return;
    const id = nextId.current++;
    setBursts((b) => [...b.slice(-2), id]);
    const timer = setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900);
    return () => clearTimeout(timer);
  }, [fed, out, reduce]);

  const unit = size / 120;
  return (
    <>
      {bursts.map((id) => {
        const set = FLAME_SPARKS[id % FLAME_SPARKS.length] ?? FLAME_SPARKS[0];
        return set.map((e) => <Ember key={`${id}-${e.at}`} unit={unit} colour={colour} {...e} />);
      })}
    </>
  );
}

function Ember({
  x,
  y,
  at,
  px,
  unit,
  colour,
}: {
  x: number;
  y: number;
  at: number;
  px: number;
  unit: number;
  colour: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(at, withSpring(1, { duration: 620, dampingRatio: 1 }));
  }, [t, at]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 0.5, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: x * unit * t.value },
      { translateY: y * unit * t.value },
      { scale: 1 - t.value * 0.5 },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: VENT.x * unit - px / 2,
          top: VENT.y * unit - px / 2,
          width: px,
          height: px,
          borderRadius: px,
          backgroundColor: colour,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overflow: { overflow: "visible" },
  ember: { position: "absolute" },
});
