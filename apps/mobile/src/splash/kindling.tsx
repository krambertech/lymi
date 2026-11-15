import { EASE_OUT, FLAME_MOTION, LANTERN_FLIGHT, type Spring } from "@lymi/design";
import { Canvas, Circle, RadialGradient, Rect, vec } from "@shopify/react-native-skia";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { CANVAS_PAINTS_LATE, Lantern } from "../brand/lantern";
import { curveFn, springAt, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Overlay } from "../ui/overlay";
import { type Screen, setFlying, useSpot } from "./landing";
import { LanternStill } from "./still";

/** The launch screen's lantern: 96 pt in the middle of the screen, expo-splash-screen's imageWidth. */
const LAUNCH_SIZE = 96;
/** The lantern is drawn at Today's size and scaled, so it lands without redrawing. */
const DRAWN = 150;

/**
 * The moments, in ms of the splash's own clock. The flame catches in place and its warm light floods
 * the room; once the screen underneath is ready the lantern rises to its spot, the flood draws back
 * into that screen's pool, and the room fades over to it. Without a wait it all ends under a second.
 */
const SPLASH = {
  light: 40,
  flood: [100, 560],
  /** The clock holds here, the room lit, until the screen underneath is ready. */
  hold: 380,
  travel: 380,
  reveal: [560, 940],
  end: 980,
} as const;
/** How far the light reaches, as a share of the lantern: flooding the room, then as a pool around it. */
const FLOOD_REACH = 7;
const POOL_REACH = 1.4;

/** Frames in a row on time before the lantern leaves, and how long it waits for them at most. */
const CALM_FRAMES = 4;
const CALM_WAIT_MS = 900;
const LATE_FRAME_MS = 24;
/** The most a stalled frame moves the clock: one frame at 60 Hz, a little over. */
const FRAME_STEP_MS = 20;
const HOLDING = 0;
const ARMED = 1;
const WAITING = 2;
const FLYING = 3;
const LANDED = 4;

/** Reduce Motion: the launch screen crossfades into the screen underneath. */
const CROSSFADE_MS = 240;

const easeOut = curveFn(EASE_OUT);

/**
 * A spring scaled to finish exactly at `by` ms. A spring only nears 1, and a flight that stops a few
 * percent short leaves the lantern beside the one it hands over to, so for a frame there are two.
 */
const settled = (ms: number, spring: Spring, by: number) => {
  "worklet";
  return Math.min(1, springAt(ms, spring) / springAt(by, spring));
};
const flight = (clock: number) => {
  "worklet";
  return settled(clock - SPLASH.travel, LANTERN_FLIGHT, SPLASH.end - SPLASH.travel);
};
const between = (t: number, [from, to]: readonly [number, number]) => {
  "worklet";
  return Math.min(1, Math.max(0, (t - from) / (to - from)));
};

interface Props {
  /** The first screen, once the session has been read: one with a lantern to land on, or elsewhere. */
  lands: Screen | "elsewhere" | undefined;
  /** The first frame matches the launch screen, so it can go without a flash. */
  onShown: () => void;
  onDone: () => void;
}

/**
 * The launch screen's unlit lantern, picked up as the app's code loads: the flame catches, its light
 * fills the room, and the lantern lands where it sits on Today or Welcome. It plays on a cold start
 * only and never waits for data: the screen underneath shows its own loading state.
 */
export function Kindling({ lands, onShown, onDone }: Props) {
  const reduce = useReduceMotion();
  const p = usePalette();
  const { width, height } = useWindowDimensions();
  const measured = useSpot();
  // Welcome lays out while the session is read, so only the screen being landed on counts.
  const spot = measured && measured.screen === lands ? measured : null;
  const ready = lands !== undefined;
  const clock = useSharedValue(0);
  const [landing, setLanding] = useState(false);

  const x = spot?.x ?? width / 2;
  const y = spot?.y ?? height / 2;
  const size = spot?.size ?? LAUNCH_SIZE;
  const flameTo = spot?.flame ?? 1;
  const target = useSharedValue({ x, y, size, flame: flameTo });
  useEffect(() => {
    target.value = { x, y, size, flame: flameTo };
  }, [x, y, size, flameTo, target]);

  // Under Reduce Motion nothing travels, so the lantern underneath shows through the crossfade.
  useEffect(() => {
    setFlying(!reduce);
    return () => setFlying(false);
  }, [reduce]);

  // The lantern underneath shows first and the splash goes a frame later, so no frame has neither.
  const land = useCallback(() => {
    setFlying(false);
    requestAnimationFrame(() => requestAnimationFrame(onDone));
  }, [onDone]);

  // The clock runs to the hold, then on to the end once the screen underneath is ready.
  const holdAt = useSharedValue(reduce ? 0 : SPLASH.hold);
  const endAt = useSharedValue(reduce ? CROSSFADE_MS : SPLASH.end);
  const phase = useSharedValue(HOLDING);
  const armedAt = useSharedValue(0);
  const calm = useSharedValue(0);
  // With no lantern to land on, such as a link into a review, the lit room fades where it is.
  const stays = useSharedValue(false);
  useEffect(() => {
    holdAt.value = reduce ? 0 : SPLASH.hold;
    endAt.value = reduce ? CROSSFADE_MS : SPLASH.end;
    if (!ready) return;
    // The screen underneath measures its lantern once it has mounted; one that never does is waited for briefly.
    const id = setTimeout(
      () => {
        if (phase.value !== HOLDING) return;
        stays.value = !spot;
        phase.value = ARMED;
      },
      spot ? 0 : 500,
    );
    return () => clearTimeout(id);
  }, [ready, reduce, holdAt, endAt, phase, stays, spot]);

  // The clock counts frames rather than time, so when mounting the screen underneath stalls the main
  // thread the lantern pauses where it is instead of jumping. It leaves only once frames come on time.
  useFrameCallback(({ timestamp, timeSincePreviousFrame }) => {
    const dt = timeSincePreviousFrame ?? 0;
    calm.value = dt > 0 && dt < LATE_FRAME_MS ? calm.value + 1 : 0;
    if (phase.value === ARMED) {
      phase.value = WAITING;
      armedAt.value = timestamp;
      calm.value = 0;
    }
    if (
      phase.value === WAITING &&
      (calm.value >= CALM_FRAMES || timestamp - armedAt.value >= CALM_WAIT_MS)
    ) {
      phase.value = FLYING;
      runOnJS(setLanding)(true);
    }
    const limit = phase.value === FLYING ? endAt.value : holdAt.value;
    if (clock.value < limit)
      clock.value = Math.min(limit, clock.value + Math.min(dt, FRAME_STEP_MS));
    if (phase.value === FLYING && clock.value >= endAt.value) {
      phase.value = LANDED;
      runOnJS(land)();
    }
  });

  // The catch runs off the clock on the UI thread, because the JS thread is busy mounting the app.
  // It catches to the brand flame and settles on the day's flame as the lantern lands.
  const flame = useDerivedValue(() => {
    if (reduce) return 0;
    const caught = settled(
      clock.value - SPLASH.light,
      FLAME_MOTION.catch,
      SPLASH.end - SPLASH.light,
    );
    const go = stays.value ? 0 : flight(clock.value);
    return caught * interpolate(go, [0, 1], [1, target.value.flame]);
  });

  const centre = useDerivedValue(() => {
    const t = clock.value;
    const go = reduce || stays.value ? 0 : flight(t);
    const at = target.value;
    return {
      x: interpolate(go, [0, 1], [width / 2, at.x]),
      y: interpolate(go, [0, 1], [height / 2, at.y]),
      size: interpolate(go, [0, 1], [LAUNCH_SIZE, at.size]),
    };
  });

  const place = useDerivedValue(() => centre.value);

  // The room, the pool and the lantern all move inside Skia, because Reanimated holds back view
  // transforms while React commits, and React commits the screen underneath all through the flight.
  const room = useDerivedValue(() =>
    reduce ? 1 : 1 - easeOut(between(clock.value, SPLASH.reveal)),
  );
  // The room again as a view, for Android, where the canvas paints a few frames late.
  const backing = useAnimatedStyle(() => ({ opacity: room.value }));
  // Under Reduce Motion, or with nowhere to land, the whole launch screen fades: a view's opacity,
  // since nothing travels for a held-back frame to show.
  const crossfade = useAnimatedStyle(() => {
    if (reduce) return { opacity: 1 - clock.value / CROSSFADE_MS };
    return { opacity: stays.value ? 1 - easeOut(between(clock.value, SPLASH.reveal)) : 1 };
  });

  // Once the flame is up, Skia has long since drawn, so the stand-in underneath goes.
  const [caught, setCaught] = useState(false);
  useAnimatedReaction(
    () => clock.value > SPLASH.light + 120,
    (now, before) => {
      if (now && !before && !reduce) runOnJS(setCaught)(true);
    },
  );

  // The light floods the room from the lantern, then draws back with it into the pool on the screen
  // underneath, and fades as that screen shows.
  const poolCentre = useDerivedValue(() => vec(centre.value.x, centre.value.y));
  const poolRadius = useDerivedValue(() => {
    const flood = easeOut(between(clock.value, SPLASH.flood));
    const back = stays.value ? 0 : flight(clock.value);
    const reach = interpolate(back, [0, 1], [FLOOD_REACH, POOL_REACH]);
    return centre.value.size * (0.4 + flood * reach);
  });
  const poolOpacity = useDerivedValue(() => {
    if (reduce) return 0;
    const flood = easeOut(between(clock.value, SPLASH.flood));
    const gone = between(clock.value, [SPLASH.reveal[0] + 80, SPLASH.end]);
    return flood * (1 - gone);
  });

  // Over everything, because the native stack mounts the screen underneath over its siblings.
  return (
    <Overlay>
      <Animated.View
        style={[StyleSheet.absoluteFill, crossfade]}
        pointerEvents={landing ? "none" : "auto"}
        onLayout={() => {
          // Skia draws a few frames after layout; until then the launch screen stays.
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(onShown)));
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {CANVAS_PAINTS_LATE && (
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: p.canvas }, backing]}
          />
        )}
        <Canvas style={StyleSheet.absoluteFill} androidWarmup>
          <Rect x={0} y={0} width={width} height={height} color={p.canvas} opacity={room} />
          <Circle c={poolCentre} r={poolRadius} opacity={poolOpacity}>
            <RadialGradient
              c={poolCentre}
              r={poolRadius}
              colors={[p["lantern-glow"], fade(p["lantern-pool"], 0.8), fade(p["lantern-pool"], 0)]}
              positions={[0, 0.45, 1]}
            />
          </Circle>
        </Canvas>
        {!caught && (
          <View
            style={[
              styles.still,
              { left: (width - LAUNCH_SIZE) / 2, top: (height - LAUNCH_SIZE) / 2 },
            ]}
          >
            <LanternStill size={LAUNCH_SIZE} />
          </View>
        )}
        <Lantern size={DRAWN} flame={flame} place={place} />
      </Animated.View>
    </Overlay>
  );
}

/** A `#rrggbbaa` colour with its alpha scaled. */
function fade(hex: string, by: number) {
  const a = hex.length === 9 ? Number.parseInt(hex.slice(7), 16) : 255;
  return `${hex.slice(0, 7)}${Math.round(a * by)
    .toString(16)
    .padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  still: { position: "absolute", width: LAUNCH_SIZE, height: LAUNCH_SIZE },
});
