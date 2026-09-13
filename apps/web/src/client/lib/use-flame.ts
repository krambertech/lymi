import {
  type AnimationPlaybackControls,
  animate,
  useMotionTemplate,
  useMotionValue,
  useReducedMotionConfig,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import { FLAME_BREATH, FLAME_MOTION, FLAME_SIZE } from "./flame";

/** Below this size the flame has faded into the ember, so growing from it is a catch. */
const VISIBLE = 0.3;

/**
 * The flame's movement, shared by the lantern and the streak flame so both catch, rise, settle
 * and go out on the same springs. `target` is a size from `lib/flame.ts`.
 */
export function useFlame({
  target,
  initial = target,
  fed,
  out = false,
}: {
  target: number;
  /** The size on mount; the flame moves from it to `target`. */
  initial?: number | undefined;
  /** Bump by one per accepted review for a breath. Omit where the flame is not fed. */
  fed?: number | undefined;
  out?: boolean | undefined;
}) {
  const reduce = useReducedMotionConfig() ?? false;
  const size = useMotionValue(initial);
  const breath = useMotionValue(0);
  const lastFed = useRef(fed);
  const breathing = useRef<{ depth: number; controls: AnimationPlaybackControls } | null>(null);

  // A new breath heads up from wherever the last one is, so reviews close together flow into one.
  const breathe = useRef((depth: number) => {
    breathing.current?.controls.stop();
    const controls = animate(breath, depth, {
      ...FLAME_MOTION.breathIn,
      onComplete: () => {
        breathing.current = {
          depth: 0,
          controls: animate(breath, 0, FLAME_MOTION.breathOut),
        };
      },
    });
    breathing.current = { depth, controls };
  }).current;

  useEffect(() => {
    if (reduce) {
      size.jump(target);
      return;
    }
    // Chosen from what is on screen rather than the last target, so an interrupted movement and
    // StrictMode's second mount run still pick the right spring.
    const was = size.get();
    if (was === target) return;
    const visible = was >= VISIBLE;
    const rising = target === FLAME_SIZE.full && visible && was < FLAME_SIZE.full;
    const transition =
      target === FLAME_SIZE.out
        ? FLAME_MOTION.goOut
        : !visible
          ? FLAME_MOTION.catch
          : rising
            ? FLAME_MOTION.rise
            : FLAME_MOTION.settle;
    animate(size, target, transition);
    if (rising) breathe(FLAME_BREATH.rise);
  }, [target, reduce, size, breathe]);

  useEffect(() => {
    if (fed === lastFed.current) return;
    lastFed.current = fed;
    if (reduce || out) return;
    // The goal's own breath already carries this review.
    if ((breathing.current?.depth ?? 0) > FLAME_BREATH.feed) return;
    breathe(FLAME_BREATH.feed);
  }, [fed, out, reduce, breathe]);

  useEffect(
    () => () => {
      breathing.current?.controls.stop();
      size.stop();
    },
    [size],
  );

  // Height carries the growth; width follows at half the rate, and a breath draws the flame up and thin.
  const scaleY = useTransform(() => size.get() + breath.get() * 0.08);
  const scaleX = useTransform(() => 1 + (size.get() - 1) * 0.5 - breath.get() * 0.02);
  const transform = useMotionTemplate`scale(${scaleX}, ${scaleY})`;
  const flameOpacity = useTransform(size, [0, VISIBLE], [0, 1]);
  const emberOpacity = useTransform(size, [0, VISIBLE], [1, 0]);

  return { size, breath, transform, flameOpacity, emberOpacity };
}
