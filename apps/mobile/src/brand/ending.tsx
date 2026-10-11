import { EASE_OUT, EMBER_DRIFT, END_OF_REVIEW, type EndEmber, POOL_BLOOM_MS } from "@lymi/design";
import {
  BlurStyle,
  Canvas,
  Circle,
  createPicture,
  Group,
  Picture,
  RadialGradient,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  Easing,
  interpolate,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ALWAYS, curveFn } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { FLICKER_MS } from "./lantern";

// What the lantern throws into the room at the end of a review: the pool of its light and the
// embers off its flame. Both read the screen's one clock, so finishing the clock finishes them.

/** The pool reaches this far past the lantern on every side, as a share of its size. */
const POOL_REACH = 0.85;
/** Where the flame sits in the lantern's box, from the top. */
const FLAME_AT = 0.52;

const easeOut = curveFn(EASE_OUT);
const drift = curveFn(EMBER_DRIFT);

/** A `#rrggbbaa` colour with its alpha scaled. */
function fade(hex: string, by: number) {
  const a = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) : 255;
  const alpha = Math.round(a * by)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 7)}${alpha}`;
}

interface PoolProps {
  /** The lantern's size; the pool is centred on it. */
  size: number;
  /** Ms since the review ended. */
  clock: SharedValue<number>;
  /** Full on an end that added reviews, half on one that added none. */
  strength: number;
  /** Under reduced motion the pool is simply there and does not breathe: a glow is a state. */
  still: boolean;
}

/** The lantern lights the room: a pool of its glow blooms behind it, then breathes on the flicker's loop. */
export function LightPool({ size, clock, strength, still }: PoolProps) {
  const p = usePalette();
  const breath = useSharedValue(0);
  useEffect(() => {
    if (still) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: FLICKER_MS, easing: Easing.linear, reduceMotion: ALWAYS }),
      -1,
    );
  }, [still, breath]);

  const box = size * (1 + POOL_REACH * 2);
  const r = box / 2;
  const opacity = useDerivedValue(() => {
    const bloom = easeOut(
      Math.min(1, Math.max(0, (clock.value - END_OF_REVIEW.pool) / POOL_BLOOM_MS)),
    );
    const breathe = interpolate(breath.value, [0, 0.3, 1], [0.9, 1, 0.9]);
    return strength * bloom * (1 + (breathe - 1) * bloom);
  });
  const transform = useDerivedValue(() => {
    const bloom = easeOut(
      Math.min(1, Math.max(0, (clock.value - END_OF_REVIEW.pool) / POOL_BLOOM_MS)),
    );
    const breathe = interpolate(breath.value, [0, 0.3, 1], [1, 1.07, 1]);
    return [{ scale: (0.35 + 0.65 * bloom) * (1 + (breathe - 1) * bloom) }];
  });

  return (
    <View pointerEvents="none" style={[styles.centred, around(size, box)]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group opacity={opacity} transform={transform} origin={vec(r, r)}>
          <Circle cx={r} cy={r} r={r}>
            <RadialGradient
              c={vec(r, r)}
              r={r}
              colors={[p.glow, fade(p.glow, 0.4), fade(p.glow, 0)]}
              positions={[0, 0.45, 1]}
            />
          </Circle>
        </Group>
      </Canvas>
    </View>
  );
}

interface EmbersProps {
  size: number;
  clock: SharedValue<number>;
  embers: EndEmber[];
}

/** Embers lift off the flame once, as many as the review earned, each glowing as it rises and fades. */
export function EndEmbers({ size, clock, embers }: EmbersProps) {
  const p = usePalette();
  const box = size * (1 + POOL_REACH * 2);
  const ox = box / 2;
  const oy = box / 2 - size / 2 + size * FLAME_AT;
  const core = p["flame-core"];
  const amber = p.amber;
  const glow = p.glow;

  const picture = useDerivedValue(() =>
    createPicture((canvas) => {
      const t = clock.value - END_OF_REVIEW.embers;
      if (t <= 0) return;
      const halo = Skia.Paint();
      halo.setColor(Skia.Color(glow));
      halo.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 5, true));
      const rim = Skia.Paint();
      rim.setColor(Skia.Color(amber));
      rim.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 2, true));
      const dot = Skia.Paint();
      dot.setColor(Skia.Color(core));
      for (const e of embers) {
        const u = (t - e.at) / e.dur;
        if (u <= 0 || u >= 1) continue;
        const q = drift(u);
        const o = interpolate(u, [0, 0.12, 1], [0, 1, 0]);
        const x = ox + e.x * q;
        const y = oy + e.y * q;
        const r = (e.size / 2) * (1 - 0.7 * q);
        halo.setAlphaf(o);
        canvas.drawCircle(x, y, r + 5, halo);
        rim.setAlphaf(o);
        canvas.drawCircle(x, y, r + 1, rim);
        dot.setAlphaf(o);
        canvas.drawCircle(x, y, r, dot);
      }
    }),
  );

  return (
    <View pointerEvents="none" style={[styles.centred, around(size, box)]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

/** A square of `box` centred on a lantern of `size`. */
function around(size: number, box: number) {
  const inset = (size - box) / 2;
  return { left: inset, top: inset, width: box, height: box };
}

const styles = StyleSheet.create({ centred: { position: "absolute" } });
