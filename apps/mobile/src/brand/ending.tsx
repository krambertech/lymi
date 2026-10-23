import {
  EASE_OUT,
  EMBER_DRIFT,
  END_OF_REVIEW,
  type EndEmber,
  FLECK_HOT_MS,
  fleckAt,
  lightBurst,
  POOL_BLOOM_MS,
  type Point,
  SPARK_FLIGHT,
  SPARK_MS,
  SPARK_TRAIL,
  sparkAt,
} from "@lymi/design";
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
  type AnimatedRef,
  Easing,
  interpolate,
  measure,
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
const flight = curveFn(SPARK_FLIGHT);
const BURST = lightBurst(10);

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

interface TurnProps {
  clock: SharedValue<number>;
  /** The screen the canvas covers, and the three places the spark joins. */
  room: AnimatedRef<View>;
  lantern: AnimatedRef<View>;
  today: AnimatedRef<View>;
  run: AnimatedRef<View>;
}

/**
 * When the day has just turned, a spark leaves the lantern's flame and drops into today's light,
 * which flares and throws a few flecks as it fills; a smaller spark hops on to the run's flame,
 * which throws three of its own as it catches. The places are measured on the UI thread each frame,
 * so a part still rising into place never misplaces the spark. motion.md "The end of a review".
 */
export function TurnSpark({ clock, room, lantern, today, run }: TurnProps) {
  const p = usePalette();
  const core = p["flame-core"];
  const amber = p.amber;
  const glow = p.glow;
  const tones = [p["light-1"], p["light-2"], core];

  const picture = useDerivedValue(() =>
    createPicture((canvas) => {
      const t = clock.value;
      if (t < END_OF_REVIEW.spark || t > END_OF_REVIEW.tick + 1300) return;
      const box = measure(room);
      const l = measure(lantern);
      const g = measure(today);
      const r = measure(run);
      if (!box || !l || !g || !r) return;
      const vent = {
        x: l.pageX - box.pageX + l.width / 2,
        y: l.pageY - box.pageY + l.height * FLAME_AT,
      };
      const light = { x: g.pageX - box.pageX + g.width / 2, y: g.pageY - box.pageY };
      const flame = {
        x: r.pageX - box.pageX + r.width / 2,
        y: r.pageY - box.pageY + r.height * 0.35,
      };

      const paint = Skia.Paint();
      const dot = (at: Point, radius: number, colour: string, blur: number, alpha: number) => {
        if (blur > 0) {
          paint.setColor(Skia.Color(glow));
          paint.setAlphaf(alpha);
          paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, blur, true));
          canvas.drawCircle(at.x, at.y, radius + blur / 2, paint);
          paint.setMaskFilter(null);
        }
        paint.setColor(Skia.Color(colour));
        paint.setAlphaf(alpha);
        canvas.drawCircle(at.x, at.y, radius, paint);
      };
      const leg = (
        from: Point,
        to: Point,
        leaves: number,
        ms: number,
        bend: number,
        size: number,
      ) => {
        for (let k = SPARK_TRAIL.dots - 1; k >= 0; k--) {
          const u = (t - leaves - k * SPARK_TRAIL.step) / ms;
          if (u <= 0 || u >= 1) continue;
          const at = sparkAt(flight(u), from, to, bend);
          const head = k === 0;
          dot(
            at,
            size * (1 - k / 9),
            head ? core : amber,
            head ? 6 : 2,
            head ? 1 : (1 - k / SPARK_TRAIL.dots) * 0.55,
          );
        }
      };

      // Today's light takes the lantern's glow for a moment as it fills: a halo outside the glass only.
      const lit = t - END_OF_REVIEW.land;
      const flare = lit <= 0 ? 0 : Math.min(1, lit / 330) * Math.exp(-Math.max(0, lit - 330) / 420);
      if (flare > 0.01) {
        const glass = Skia.RRectXY(
          Skia.XYWHRect(g.pageX - box.pageX, light.y, g.width, g.height),
          6,
          6,
        );
        paint.setColor(Skia.Color(glow));
        paint.setAlphaf(flare);
        paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Outer, 7, true));
        canvas.drawRRect(glass, paint);
        paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Outer, 2.5, true));
        canvas.drawRRect(glass, paint);
        paint.setMaskFilter(null);
      }

      leg(vent, light, END_OF_REVIEW.spark, SPARK_MS.land, 90, 3.4);
      leg({ x: light.x, y: light.y - 2 }, flame, END_OF_REVIEW.hop, SPARK_MS.hop, -30, 2.4);

      for (const f of BURST) {
        const at = fleckAt(f, lit);
        if (at.opacity <= 0) continue;
        const hot = Math.max(0, 1 - (lit - f.at) / FLECK_HOT_MS);
        canvas.save();
        canvas.translate(light.x + at.x, light.y + at.y);
        canvas.rotate((at.turn * 0.6 * 180) / Math.PI, 0, 0);
        // A fleck turning edge-on narrows, which is what makes it read as tumbling.
        canvas.scale(Math.max(0.18, Math.abs(Math.cos(at.turn))), 1);
        paint.setColor(Skia.Color(hot > 0.5 ? core : (tones[f.tone - 1] ?? amber)));
        paint.setAlphaf(at.opacity);
        canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(-f.w / 2, -f.h / 2, f.w, f.h), 1, 1), paint);
        canvas.restore();
      }

      for (let i = 0; i < 3; i++) {
        const u = (t - END_OF_REVIEW.tick - 40 - i * 70) / 620;
        if (u <= 0 || u >= 1) continue;
        const q = drift(u);
        dot(
          { x: flame.x + (i - 1) * 7 * q, y: flame.y - 8 - 22 * q },
          1.6 * (1 - 0.5 * q),
          core,
          3,
          1 - u,
        );
      }
    }),
  );

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Picture picture={picture} />
    </Canvas>
  );
}

/** A square of `box` centred on a lantern of `size`. */
function around(size: number, box: number) {
  const inset = (size - box) / 2;
  return { left: inset, top: inset, width: box, height: box };
}

const styles = StyleSheet.create({ centred: { position: "absolute" } });
