import { clsx } from "clsx";
import {
  type AnimationPlaybackControls,
  animate,
  interpolate,
  type MotionStyle,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotionConfig,
  useTransform,
} from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";
import { FLAME_BREATH, FLAME_MOTION, FLAME_SIZE, flameSize } from "../lib/flame";
import {
  draw,
  EMBER,
  FLAME_PARTS,
  LANTERN_BAIL,
  LANTERN_FRAME,
  LANTERN_GLASS,
} from "./lantern-geometry";

function startSize(from: Props["from"], target: number) {
  if (from === undefined) return target;
  if (from === "out") return FLAME_SIZE.out;
  if (from === "brand") return 1;
  return flameSize(from);
}

/** Below this size the flame has faded into the ember, so growing from it is a catch. */
const VISIBLE = 0.3;

const glowFor = interpolate([0, FLAME_SIZE.start, 1, FLAME_SIZE.full], [0, 0.7, 1, 1.7]);

interface Props {
  /**
   * Today's accepted reviews over the daily goal, 0 to 1. The flame starts the day small, grows
   * with each review and stands full at 1. Omit it where the lantern is the brand rather than
   * the learner's: login, the app icon, public pages.
   */
  progress?: number | undefined;
  /** There is no streak. The only time the flame is out, never for nothing due; reviews feed nothing until it catches. */
  out?: boolean | undefined;
  /** Bump by one for every accepted review, whatever the grade. Each change feeds the flame. */
  fed?: number | undefined;
  /** The condition to grow from on mount, so an arriving lantern continues the one before it. */
  from?: number | "brand" | "out" | undefined;
  /** Gentle ambient movement. Off under reduced motion. */
  flicker?: boolean | undefined;
  /** The halo around the light. The only glow in the interface. */
  glow?: boolean | undefined;
  /** Carried: the body swings from the bail. App launch and pull to refresh. */
  carry?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  title?: string | undefined;
}

/**
 * The one illustration in Lymi: a storm lantern you carry, and the fire inside it. The flame is
 * one continuous value, so a review, the goal and a broken streak all move the same fire rather
 * than swapping drawings. DESIGN.md, "The flame".
 */
export function Lantern({
  progress,
  out = false,
  fed = 0,
  from,
  flicker = false,
  glow = false,
  carry = false,
  className,
  style,
  title,
}: Props) {
  const reduce = useReducedMotionConfig() ?? false;
  const target = flameSize(progress, out);

  const size = useMotionValue(startSize(from, target));
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
  const unlitGlass = useTransform(size, [0, 0.5], [1, 0]);
  const glowLevel = useTransform(() => glowFor(size.get()) + breath.get() * 0.45);

  const cls = clsx(
    "lantern shrink-0 select-none overflow-visible text-metal",
    !title && "pointer-events-none",
    className,
    flicker && "lantern-flicker",
    glow && "glow",
    carry && "lantern-carry",
  );
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };

  return (
    <svg viewBox="0 0 120 120" className={cls} style={style} {...a11y}>
      {title && <title>{title}</title>}
      <g className="lantern-body">
        <g className="lantern-bail">{draw(LANTERN_BAIL, "bail")}</g>
        {draw(LANTERN_GLASS, "glass")}
        <motion.g style={{ opacity: unlitGlass }}>
          {draw({ ...LANTERN_GLASS, fill: "glass-unlit" }, "glass-unlit")}
        </motion.g>
        <motion.g className="lantern-light" style={{ "--glow-level": glowLevel } as MotionStyle}>
          <motion.g style={{ opacity: emberOpacity }}>{draw(EMBER, "ember")}</motion.g>
          <motion.g
            className="flame-size"
            // Motion writes the SVG origin itself, so the base is named here rather than in CSS.
            style={{ transform, opacity: flameOpacity, originX: 0.5, originY: 1 }}
          >
            {FLAME_PARTS()}
          </motion.g>
        </motion.g>
        {LANTERN_FRAME.map((s, i) => draw(s, `frame-${i}`))}
      </g>
    </svg>
  );
}
