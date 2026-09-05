import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { GLYPH_PARTS, LANTERN_PARTS } from "./lantern-geometry";

type Variant = "lit" | "unlit" | "glyph";

interface Props {
  /** "lit" has a flame. "unlit" for when nothing is due. "glyph" is the simplified mark for 12 to 27 px. */
  variant?: Variant | undefined;
  /** Gentle flame movement. Off under reduced motion automatically. */
  flicker?: boolean | undefined;
  /** The lantern's own glow. The only glow in the interface. */
  glow?: boolean | undefined;
  /** Momentary flare, e.g. after grading Good. */
  flare?: boolean | undefined;
  /** Fully lit: bigger flame, wider glow. End of a session. */
  litUp?: boolean | undefined;
  /** The wick catching. Give the element a new React key to replay it. */
  catchLight?: boolean | undefined;
  /** Carried: the body swings from the bail. App launch and pull to refresh. */
  carry?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  title?: string | undefined;
}

/**
 * The one illustration in Lymi: a storm lantern you carry. The metal is --metal (ink in the
 * light room, ivory in the dark one), the glass is opaque so the mark sits on any surface,
 * and the flame is the only pure accent.
 */
export function Lantern({
  variant = "lit",
  flicker = false,
  glow = false,
  flare = false,
  litUp = false,
  catchLight = false,
  carry = false,
  className,
  style,
  title,
}: Props) {
  const lit = variant !== "unlit";
  const cls = clsx(
    "lantern shrink-0 select-none text-metal",
    !title && "pointer-events-none",
    className,
    flicker && "lantern-flicker",
    (glow || litUp) && lit && "glow",
    flare && "lantern-flare",
    litUp && "lantern-lit",
    catchLight && lit && "lantern-catch",
    carry && "lantern-carry",
  );
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };
  const parts = variant === "glyph" ? GLYPH_PARTS : LANTERN_PARTS;

  return (
    <svg viewBox="0 0 120 120" className={cls} style={style} {...a11y}>
      {title && <title>{title}</title>}
      <g className="lantern-body">{parts(lit)}</g>
    </svg>
  );
}
