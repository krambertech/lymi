import { clsx } from "clsx";

/**
 * The lantern's flame on its own, cropped to its own box. The streak mark, and the only
 * place amber appears outside the lantern and the primary button.
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
      viewBox="48 39 24 26"
      className={clsx("lantern shrink-0 select-none", flicker && "lantern-flicker", className)}
      {...a11y}
    >
      {title && <title>{title}</title>}
      <g className="flame">
        <path
          d="M60 41 C67.5 49.5 70 55 68 61.5 A8 8 0 0 1 52 61.5 C50 55 52.5 49.5 60 41 Z"
          fill="var(--amber)"
        />
        <path
          d="M60 52 C63.5 56 64.5 58.5 63.5 61.5 A3.5 3.5 0 0 1 56.5 61.5 C55.5 58.5 56.5 56 60 52 Z"
          fill="var(--flame-core)"
        />
      </g>
    </svg>
  );
}
