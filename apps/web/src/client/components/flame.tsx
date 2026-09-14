import { clsx } from "clsx";
import { motion } from "motion/react";
import { STREAK_FLAME_SIZE, type StreakFlameState } from "../lib/flame";
import { useFlame } from "../lib/use-flame";
import { draw, EMBER, EMBER_AT_FLAME_SIZE, FLAME_BOUNDS, FLAME_PARTS } from "./lantern-geometry";

const { left, right, top, bottom } = FLAME_BOUNDS;

interface Props {
  /** From `streakFlameFor`, so the flame agrees with the lantern for the same summary. */
  state?: StreakFlameState | undefined;
  /** The ambient loop. The streak passes it once today's goal is met. */
  flicker?: boolean | undefined;
  className?: string | undefined;
  title?: string | undefined;
}

/**
 * The lantern's flame on its own, cropped to its own box: the streak's mark. It moves on the
 * lantern's springs, so catching at the goal is the lantern's catch at this size. DESIGN.md,
 * "The flame".
 *
 * The box is the lit flame's exact bounds, so the tip sits on the top edge and a full or
 * flickering flame grows past it. The drawing overflows rather than being cropped, because a
 * clipped tip is the one thing that makes the mark look broken.
 */
export function Flame({ state = "lit", flicker = false, className, title }: Props) {
  const out = state === "out";
  const { transform, flameOpacity, emberOpacity } = useFlame({
    target: STREAK_FLAME_SIZE[state],
    out,
  });
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };
  return (
    <svg
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      className={clsx(
        "shrink-0 select-none overflow-visible",
        flicker && !out && "lantern-flicker",
        className,
      )}
      data-flame={state}
      {...a11y}
    >
      {title && <title>{title}</title>}
      <motion.g style={{ opacity: emberOpacity }}>
        <g transform={EMBER_AT_FLAME_SIZE}>{draw(EMBER, "ember")}</g>
      </motion.g>
      <motion.g style={{ transform, opacity: flameOpacity, originX: 0.5, originY: 1 }}>
        {FLAME_PARTS()}
      </motion.g>
    </svg>
  );
}
