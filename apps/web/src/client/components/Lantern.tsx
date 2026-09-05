import { clsx } from "clsx";
import type { CSSProperties } from "react";

type Variant = "lit" | "unlit" | "glyph";

interface Props {
  /** "lit" has a flame. "unlit" for when nothing is due. "glyph" is the simplified mark for 12 to 24 px. */
  variant?: Variant | undefined;
  /** Gentle flame movement. Off under reduced motion automatically. */
  flicker?: boolean | undefined;
  /** The lantern's own glow. The only glow in the interface. */
  glow?: boolean | undefined;
  /** Momentary flare, e.g. after grading Good. */
  flare?: boolean | undefined;
  /** Fully lit: bigger flame, wider glow. End of a session. */
  litUp?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  title?: string | undefined;
}

/**
 * The one illustration in Lymi: a storm lantern you carry. The metal is --metal (ink in the
 * light room, ivory in the dark one), the glass is tinted amber, the flame is the only pure accent.
 */
export function Lantern({
  variant = "lit",
  flicker = false,
  glow = false,
  flare = false,
  litUp = false,
  className,
  style,
  title,
}: Props) {
  const cls = clsx(
    "lantern shrink-0 select-none text-metal",
    !title && "pointer-events-none",
    className,
    flicker && "lantern-flicker",
    (glow || litUp) && variant !== "unlit" && "glow",
    flare && "lantern-flare",
    litUp && "lantern-lit",
  );
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };

  if (variant === "glyph") {
    return (
      <svg viewBox="0 0 100 100" className={cls} style={style} {...a11y}>
        {title && <title>{title}</title>}
        <path
          d="M34 20 A16 16 0 0 1 66 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <rect x="29" y="24" width="42" height="50" rx="9" fill="var(--amber)" />
        <rect x="24" y="16" width="52" height="12" rx="5" fill="currentColor" />
        <rect x="22" y="70" width="56" height="12" rx="5" fill="currentColor" />
      </svg>
    );
  }

  const unlit = variant === "unlit";
  return (
    <svg viewBox="0 0 120 120" className={cls} style={style} {...a11y}>
      {title && <title>{title}</title>}
      <path
        d="M43 22 A17 17 0 0 1 77 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      {/* Frame, then the window over it. The cap and base are the top and bottom edges, so no edge doubles. */}
      <rect x="35.75" y="22" width="48.5" height="59" rx="6" fill="currentColor" />
      <rect x="35" y="19.25" width="50" height="6.5" rx="3.25" fill="currentColor" />
      <rect x="33" y="77.25" width="54" height="6.5" rx="3.25" fill="currentColor" />
      {/* The window: an opaque base in the room's colour, then the amber tint over it. */}
      <rect x="42.25" y="25.75" width="35.5" height="51.5" rx="5" fill="var(--canvas)" />
      <rect
        x="42.25"
        y="25.75"
        width="35.5"
        height="51.5"
        rx="5"
        fill={unlit ? "var(--plate-2)" : "var(--amber-soft)"}
      />
      {unlit ? (
        <path
          d="M60 48 C65 54 66.5 57.5 65 62 A5.5 5.5 0 0 1 55 62 C53.5 57.5 55 54 60 48 Z"
          fill="var(--edge-2)"
        />
      ) : (
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
      )}
    </svg>
  );
}
