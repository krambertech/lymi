import { EASE_OUT, FLAME_MOTION, LANTERN_FLIGHT } from "@lymi/design";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { Lantern } from "../brand/lantern";
import { curveFn, springAt, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
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
const between = (t: number, [from, to]: readonly [number, number]) => {
  "worklet";
  return Math.min(1, Math.max(0, (t - from) / (to - from)));
};

interface Props {
  /** The screen the splash lands on, once the session has been read. */
  lands: Screen | undefined;
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
  const insets = useSafeAreaInsets();
  const measured = useSpot();
  // Welcome lays out while the session is read, so only the screen being landed on counts.
  const spot = measured && measured.screen === lands ? measured : null;
  const ready = lands !== undefined;
  const clock = useSharedValue(0);
  const [landing, setLanding] = useState(false);

  // A screen that never lays out a lantern still gets one: Today's spot under its large title.
  const x = spot?.x ?? width / 2;
  const y = spot?.y ?? insets.top + 175;
  const size = spot?.size ?? DRAWN;
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
  useEffect(() => {
    holdAt.value = reduce ? 0 : SPLASH.hold;
    endAt.value = reduce ? CROSSFADE_MS : SPLASH.end;
    if (!ready) return;
    // The screen underneath measures its lantern once it has mounted; one that never does is waited for briefly.
    const id = setTimeout(
      () => {
        if (phase.value === HOLDING) phase.value = ARMED;
      },
      spot ? 0 : 500,
    );
    return () => clearTimeout(id);
  }, [ready, reduce, holdAt, endAt, phase, spot]);

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
    const caught = springAt(clock.value - SPLASH.light, FLAME_MOTION.catch);
    const go = springAt(clock.value - SPLASH.travel, LANTERN_FLIGHT);
    return caught * interpolate(go, [0, 1], [1, target.value.flame]);
  });

  const centre = useDerivedValue(() => {
    const t = clock.value;
    const go = reduce ? 0 : springAt(t - SPLASH.travel, LANTERN_FLIGHT);
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
  // Under Reduce Motion the whole launch screen crossfades, the one thing here that is a view's opacity.
  const crossfade = useAnimatedStyle(() => ({
    opacity: reduce ? 1 - clock.value / CROSSFADE_MS : 1,
  }));

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
    const back = springAt(clock.value - SPLASH.travel, LANTERN_FLIGHT);
    const reach = interpolate(back, [0, 1], [FLOOD_REACH, POOL_REACH]);
    return centre.value.size * (0.4 + flood * reach);
  });
  const poolOpacity = useDerivedValue(() => {
    if (reduce) return 0;
    const flood = easeOut(between(clock.value, SPLASH.flood));
    const gone = between(clock.value, [SPLASH.reveal[0] + 80, SPLASH.end]);
    return flood * (1 - gone);
  });

  // A window of its own, because the native stack mounts the screen underneath over its siblings.
  return (
    <FullWindowOverlay>
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
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={width} height={height} color={p.canvas} opacity={room} />
          <Circle c={poolCentre} r={poolRadius} opacity={poolOpacity}>
            <RadialGradient
              c={poolCentre}
              r={poolRadius}
              colors={[p.glow, fade(p.pool, 0.8), fade(p.pool, 0)]}
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
    </FullWindowOverlay>
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
