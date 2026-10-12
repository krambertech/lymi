import {
  EMBER,
  FLAME_BOUNDS,
  FLAME_BREATH,
  FLAME_CORE,
  FLAME_CORE_BASE,
  FLAME_MOTION,
  FLAME_OUTER,
  FLAME_SIZE,
  FLAME_SPARKS,
  flameSize,
  LANTERN_BAIL,
  LANTERN_FRAME,
  LANTERN_GLASS,
  type Shape,
  VENT,
} from "@lymi/design";
import {
  BlurMask,
  BlurStyle,
  Canvas,
  Circle,
  createPicture,
  Group,
  LinearGradient,
  Path,
  Picture,
  RadialGradient,
  Rect,
  RoundedRect,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useRef } from "react";
import { View, type ViewStyle } from "react-native";
import {
  Easing,
  interpolate,
  SensorType,
  type SharedValue,
  useAnimatedSensor,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ALWAYS, spring, springAt, useReduceMotion } from "../theme/motion";
import { clear, usePalette } from "../theme/palette";

const SPRING = {
  settle: spring(FLAME_MOTION.settle),
  rise: spring(FLAME_MOTION.rise),
  catch: spring(FLAME_MOTION.catch),
  goOut: spring(FLAME_MOTION.goOut),
  breathIn: spring(FLAME_MOTION.breathIn),
  breathOut: spring(FLAME_MOTION.breathOut),
};

/** The flicker's loop, which the halo breathes on too. */
export const FLICKER_MS = 2600;
/** Long enough for a set's last ember to leave and fade. */
const SPARK_MS = 1000;
/** The canvas spills past the box by this share of it, so the halo and the sparks are never cut. */
const SPILL = 0.2;

const path = (d: string) => {
  const p = Skia.Path.MakeFromSVGString(d);
  if (!p) throw new Error(`The lantern cannot read ${d}`);
  return p;
};
const BAIL = path(LANTERN_BAIL.d);
const OUTER = path(FLAME_OUTER.d);
const CORE = path(FLAME_CORE.d);
const UNLIT = path(EMBER.d);
const FRAME = LANTERN_FRAME.map((s) => ({ ...s, path: s.d ? path(s.d) : undefined }));
const HALO = { x: 60, y: 80, r: 26 };

interface Props {
  size: number;
  /** Today's accepted reviews over the goal. Omit for the brand lantern. */
  progress?: number | undefined;
  out?: boolean | undefined;
  /** Bump by one per accepted review: a breath and a spark. */
  fed?: number | undefined;
  flicker?: boolean | undefined;
  glow?: boolean | undefined;
  /** The glass catches a highlight as the phone tilts: Today's big lantern only. phone.md "Light". */
  tilt?: boolean | undefined;
  style?: ViewStyle | undefined;
}

/** The storm lantern, drawn with Skia so the flame, its halo and its sparks move on the UI thread. brand.md. */
export function Lantern({
  size,
  progress,
  out = false,
  fed = 0,
  flicker = true,
  glow = true,
  tilt = false,
  style,
}: Props) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const target = flameSize(progress, out);
  const flame = useSharedValue(target);
  const breath = useSharedValue(0);
  const flick = useSharedValue(0);
  const sparks = [useSharedValue(-1), useSharedValue(-1), useSharedValue(-1)] as const;
  const lastFed = useRef(fed);
  const bursts = useRef(0);

  useEffect(() => {
    // Under reduced motion the flame takes each new size at once.
    if (reduce) {
      flame.value = target;
      return;
    }
    const was = flame.value;
    const rising = target === FLAME_SIZE.full && was < FLAME_SIZE.full && was >= 0.3;
    const settle =
      target === FLAME_SIZE.out
        ? SPRING.goOut
        : was < 0.3
          ? SPRING.catch
          : rising
            ? SPRING.rise
            : SPRING.settle;
    flame.value = withSpring(target, settle);
    if (rising)
      breath.value = withSequence(
        withSpring(FLAME_BREATH.rise, SPRING.breathIn),
        withSpring(0, SPRING.breathOut),
      );
  }, [target, reduce, flame, breath]);

  useEffect(() => {
    // A grade taken back lowers the count without feeding the flame.
    const grew = fed > lastFed.current;
    lastFed.current = fed;
    if (!grew || reduce || out) return;
    // Each breath starts from wherever the last one is, so close reviews flow into one.
    breath.value = withSequence(
      withSpring(FLAME_BREATH.feed, SPRING.breathIn),
      withSpring(0, SPRING.breathOut),
    );
    // Grades take the three sets in turn, and a set's slot is free again before it comes round.
    const slot = sparks[bursts.current++ % sparks.length];
    if (slot) {
      slot.value = 0;
      slot.value = withTiming(SPARK_MS, {
        duration: SPARK_MS,
        easing: Easing.linear,
        reduceMotion: ALWAYS,
      });
    }
  }, [fed, out, reduce, breath, sparks]);

  useEffect(() => {
    if (!flicker || reduce) {
      flick.value = 0;
      return;
    }
    flick.value = withRepeat(
      withTiming(1, { duration: FLICKER_MS, easing: Easing.linear, reduceMotion: ALWAYS }),
      -1,
    );
  }, [flicker, reduce, flick]);

  const k = size / 120;
  const spill = Math.ceil(size * SPILL);

  // The web's keyframes, 0 → 30% → 55% → 80% → 100%; the flame grows from its own base.
  const flameTransform = useDerivedValue(() => {
    const t = flick.value;
    const fy = interpolate(t, [0, 0.3, 0.55, 0.8, 1], [1, 1.07, 0.965, 1.05, 1]);
    const fx = interpolate(t, [0, 0.3, 0.55, 0.8, 1], [1, 0.97, 1.03, 0.98, 1]);
    const s = flame.value;
    return [
      { scaleX: (1 + (s - 1) * 0.5 - breath.value * 0.02) * fx },
      { scaleY: (s + breath.value * 0.08) * fy },
    ];
  });
  const flameOpacity = useDerivedValue(() => interpolate(flame.value, [0, 0.3], [0, 1], "clamp"));
  // The bright core beats slightly out of phase inside the flame.
  const coreTransform = useDerivedValue(() => {
    const t = flick.value;
    return [
      { scaleX: interpolate(t, [0, 0.35, 0.7, 1], [1, 0.93, 1.06, 1]) },
      { scaleY: interpolate(t, [0, 0.35, 0.7, 1], [1, 1.12, 0.94, 1]) },
    ];
  });
  const emberOpacity = useDerivedValue(() => interpolate(flame.value, [0, 0.3], [1, 0], "clamp"));
  const unlitOpacity = useDerivedValue(() => interpolate(flame.value, [0, 0.5], [1, 0], "clamp"));
  // The halo's width follows the flame, from 0.7× the brand halo to 1.7× at the goal, and breathes with it.
  const haloLevel = useDerivedValue(() => {
    const level = interpolate(
      flame.value,
      [0, FLAME_SIZE.start, 1, FLAME_SIZE.full],
      [0, 0.7, 1, 1.7],
    );
    const pulse = interpolate(flick.value, [0, 0.3, 0.62, 1], [1, 1.12, 0.94, 1]);
    return (level + breath.value * 0.45) * pulse;
  });
  const haloOpacity = useDerivedValue(() => Math.min(1, haloLevel.value));
  const haloTransform = useDerivedValue(() => [{ scale: 0.55 + haloLevel.value * 0.45 }]);

  const sparksPicture = useSparks(sparks, k, spill, p.amber);

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Canvas
        style={{
          position: "absolute",
          left: -spill,
          top: -spill,
          width: size + spill * 2,
          height: size + spill * 2,
        }}
      >
        <Group transform={[{ translateX: spill }, { translateY: spill }, { scale: k }]}>
          <Path
            path={BAIL}
            color={p.metal}
            style="stroke"
            strokeWidth={LANTERN_BAIL.strokeWidth}
            strokeCap="round"
          />
          <Rounded shape={LANTERN_GLASS} color={p.glass} />
          <Group opacity={unlitOpacity}>
            <Rounded shape={LANTERN_GLASS} color={p["glass-unlit"]} />
          </Group>
          <Path path={UNLIT} color={p["edge-2"]} opacity={emberOpacity} />
          {glow && (
            <Group opacity={haloOpacity} transform={haloTransform} origin={vec(HALO.x, HALO.y)}>
              <Circle cx={HALO.x} cy={HALO.y} r={HALO.r}>
                <RadialGradient
                  c={vec(HALO.x, HALO.y)}
                  r={HALO.r}
                  colors={[`${p.amber}bf`, `${p.amber}40`, `${p.amber}00`]}
                  positions={[0, 0.5, 1]}
                />
              </Circle>
            </Group>
          )}
          <Group
            opacity={flameOpacity}
            transform={flameTransform}
            origin={vec(60, FLAME_BOUNDS.bottom)}
          >
            {glow && (
              // The flame's own bloom: a soft copy of it, so the light reads as light rather than paint.
              <Path path={OUTER} color={p.amber} opacity={0.55}>
                <BlurMask blur={4} style="normal" />
              </Path>
            )}
            <Path path={OUTER} color={p.amber} />
            <Group transform={coreTransform} origin={vec(60, FLAME_CORE_BASE)}>
              <Path path={CORE} color={p["flame-core"]} />
            </Group>
          </Group>
          {tilt && !reduce && <Glint sheen={p["lit-sheen"]} />}
          {FRAME.map((s) =>
            s.path ? (
              <Group key={s.d}>
                <Path path={s.path} color={p.metal} />
                {s.stroke && (
                  <Path
                    path={s.path}
                    color={p.metal}
                    style="stroke"
                    strokeWidth={s.strokeWidth}
                    strokeJoin="round"
                  />
                )}
              </Group>
            ) : (
              <Rounded key={`${s.x}-${s.y}`} shape={s} color={p.metal} />
            ),
          )}
        </Group>
        <Picture picture={sparksPicture} />
      </Canvas>
    </View>
  );
}

const GLASS_CLIP = Skia.RRectXY(
  Skia.XYWHRect(LANTERN_GLASS.x, LANTERN_GLASS.y, LANTERN_GLASS.w, LANTERN_GLASS.h),
  LANTERN_GLASS.r,
  LANTERN_GLASS.r,
);
/** The share of gravity across the screen at which the highlight reaches the glass's edge, about 30°. */
const FULL_TILT = 0.5;
/** How far back a phone in the hand usually leans, as gravity's share into the screen. */
const HELD = -0.6;

/**
 * A soft band of light across the glass that slides as the phone tilts, as iOS 26's glass catches
 * the room. It follows gravity, so holding the phone still holds it still.
 */
function Glint({ sheen }: { sheen: string }) {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: "auto" });
  const transform = useDerivedValue(() => {
    const { x, y, z } = gravity.sensor.value;
    const g = Math.hypot(x, y, z) || 1;
    const along = Math.max(-1, Math.min(1, x / g / FULL_TILT));
    const up = Math.max(-1, Math.min(1, (z / g - HELD) / FULL_TILT));
    return [
      { translateX: along * LANTERN_GLASS.w * 0.7 },
      { translateY: up * LANTERN_GLASS.h * 0.25 },
    ];
  });
  const { x, y, w, h } = LANTERN_GLASS;
  return (
    <Group clip={GLASS_CLIP}>
      <Group transform={transform}>
        <Rect x={x - w} y={y - h} width={w * 3} height={h * 3}>
          <LinearGradient
            start={vec(x, y)}
            end={vec(x + w, y + h)}
            colors={[clear(sheen), sheen, clear(sheen)]}
            positions={[0.3, 0.5, 0.7]}
          />
        </Rect>
      </Group>
    </Group>
  );
}

function Rounded({ shape: s, color }: { shape: Shape; color: string }) {
  return (
    <RoundedRect
      x={s.x ?? 0}
      y={s.y ?? 0}
      width={s.w ?? 0}
      height={s.h ?? 0}
      r={s.r ?? 0}
      color={color}
    />
  );
}

/**
 * Two or three embers per grade leave the top of the hood and drift up past the bail as they fade.
 * They hold their pixel size at any lantern size, and carry the flame's glow.
 */
function useSparks(slots: readonly SharedValue<number>[], k: number, spill: number, amber: string) {
  return useDerivedValue(() =>
    createPicture((canvas) => {
      const glow = Skia.Paint();
      glow.setColor(Skia.Color(amber));
      glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 2.5, true));
      const dot = Skia.Paint();
      dot.setColor(Skia.Color(amber));
      for (let s = 0; s < slots.length; s++) {
        const ms = slots[s]?.value ?? -1;
        if (ms < 0 || ms >= SPARK_MS) continue;
        for (const e of FLAME_SPARKS[s] ?? []) {
          const t = springAt(ms - e.at, FLAME_MOTION.spark);
          if (t <= 0) continue;
          const o = interpolate(t, [0, 0.1, 0.5, 1], [0, 1, 1, 0]);
          const x = spill + (VENT.x + e.x * t) * k;
          const y = spill + (VENT.y + e.y * t) * k;
          const r = (e.px / 2) * (1 - t * 0.5);
          glow.setAlphaf(o * 0.6);
          canvas.drawCircle(x, y, r * 2, glow);
          dot.setAlphaf(o);
          canvas.drawCircle(x, y, r, dot);
        }
      }
    }),
  );
}
