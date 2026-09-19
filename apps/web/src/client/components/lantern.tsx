import { clsx } from "clsx";
import {
  interpolate,
  type MotionStyle,
  motion,
  useReducedMotionConfig,
  useTransform,
} from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { FLAME_MOTION, FLAME_SIZE, FLAME_SPARKS, flameSize } from "../lib/flame";
import { useFlame } from "../lib/use-flame";
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

const glowFor = interpolate([0, FLAME_SIZE.start, 1, FLAME_SIZE.full], [0, 0.7, 1, 1.7]);

interface Props {
  /**
   * Today's accepted reviews over the daily goal, 0 to 1. The flame starts the day small, grows
   * with each review and stands full at 1. Omit it where the lantern is the brand rather than
   * the learner's: login, the app icon, public pages.
   */
  progress?: number | undefined;
  /** No streak and no review yet today. The only time the flame is out, never for nothing due. */
  out?: boolean | undefined;
  /** Bump by one for every accepted review, whatever the grade. Each change feeds the flame and throws a spark. */
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
 * than swapping drawings. DESIGN.md, "The lantern".
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
  const target = flameSize(progress, out);
  const { size, breath, transform, flameOpacity, emberOpacity } = useFlame({
    target,
    initial: startSize(from, target),
    fed,
    out,
  });
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
      <Sparks fed={fed} out={out} />
    </svg>
  );
}

/** Where the embers leave the lantern: the top of the hood, where a real one vents. */
const VENT = { x: 60, y: 38 } as const;

/**
 * The embers each grade throws up out of the hood, drawn over the metal. The breath says the
 * flame was fed; the spark says so at a glance.
 */
function Sparks({ fed, out }: { fed: number; out: boolean }) {
  const reduce = useReducedMotionConfig() ?? false;
  const [bursts, setBursts] = useState<number[]>([]);
  const lastFed = useRef(fed);
  const nextId = useRef(0);

  useEffect(() => {
    if (fed === lastFed.current) return;
    lastFed.current = fed;
    if (reduce || out) return;
    const id = nextId.current++;
    // Three sets at most are ever in the air, however fast the grades come.
    setBursts((b) => [...b.slice(-2), id]);
  }, [fed, out, reduce]);

  const { visualDuration } = FLAME_MOTION.spark;
  return (
    <g className="lantern-sparks">
      {bursts.map((id) => {
        const set = FLAME_SPARKS[id % FLAME_SPARKS.length] ?? FLAME_SPARKS[0];
        const last = set.length - 1;
        // Decoration with no accessible name, so the review journey finds it by test id.
        return (
          <g key={id} data-testid="lantern-spark">
            {set.map((e, i) => (
              // A zero-length round-capped stroke that does not scale: a dot of the same px at any size.
              <motion.path
                key={e.at}
                d={`M${VENT.x} ${VENT.y}h0`}
                stroke="var(--amber)"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ x: 0, y: 0, opacity: 0, strokeWidth: e.px }}
                animate={{ x: e.x, y: e.y, opacity: [0, 1, 1, 0], strokeWidth: e.px * 0.5 }}
                transition={{
                  default: { ...FLAME_MOTION.spark, delay: e.at / 1000 },
                  opacity: {
                    duration: visualDuration,
                    times: [0, 0.1, 0.5, 1],
                    ease: "easeOut",
                    delay: e.at / 1000,
                  },
                }}
                onAnimationComplete={() => {
                  if (i === last) setBursts((b) => b.filter((x) => x !== id));
                }}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}
