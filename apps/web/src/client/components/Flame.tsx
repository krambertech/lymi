import { clsx } from "clsx";
import { FLAME_BOUNDS, FLAME_PARTS } from "./lantern-geometry";

const { left, right, top, bottom } = FLAME_BOUNDS;

/**
 * The lantern's flame on its own, cropped to its own box. The streak mark, and the only place
 * amber appears outside the lantern and the primary action. It draws from `lantern-geometry`,
 * so redrawing the lantern redraws the streak with it.
 */
export function Flame({
  className,
  flicker = false,
  title,
}: {
  className?: string | undefined;
  flicker?: boolean | undefined;
  title?: string | undefined;
}) {
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };
  return (
    <svg
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      className={clsx("shrink-0 select-none", flicker && "lantern-flicker", className)}
      {...a11y}
    >
      {title && <title>{title}</title>}
      {FLAME_PARTS()}
    </svg>
  );
}
