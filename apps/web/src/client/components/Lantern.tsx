import { clsx } from "clsx";

type Variant = "lit" | "unlit" | "glyph";

interface Props {
  /** "lit" is the default with a flame. "unlit" for empty states. "glyph" is the 16 px simplified mark. */
  variant?: Variant;
  /** Gentle flame movement. Off under reduced motion automatically. */
  flicker?: boolean;
  /** Glowing halo behind the lantern. For the end of a session. */
  halo?: boolean;
  /** Momentary flare, e.g. after grading Good. */
  flare?: boolean;
  /** Fully lit up: bigger flame, wide halo, glow. */
  litUp?: boolean;
  className?: string;
  title?: string;
}

/** The one illustration in Lymi. Metal takes currentColor, so it recolours with the theme. */
export function Lantern({
  variant = "lit",
  flicker = false,
  halo = false,
  flare = false,
  litUp = false,
  className,
  title,
}: Props) {
  const cls = clsx(
    className,
    flicker && "lantern-flicker",
    halo && "lantern-pulse",
    flare && "lantern-flare",
    litUp && "lantern-lit",
  );

  if (variant === "glyph") {
    return (
      <svg
        viewBox="0 0 100 100"
        className={cls}
        aria-hidden={title ? undefined : true}
        role={title ? "img" : undefined}
      >
        {title && <title>{title}</title>}
        <path
          d="M36 16 A14 14 0 0 1 64 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <rect x="26" y="14" width="48" height="12" rx="5" fill="currentColor" />
        <rect x="31" y="26" width="38" height="42" rx="11" fill="var(--amber)" />
        <rect x="24" y="68" width="52" height="14" rx="6" fill="currentColor" />
      </svg>
    );
  }

  const unlit = variant === "unlit";
  return (
    <svg
      viewBox="0 0 120 120"
      className={cls}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {halo && <circle className="halo" cx="60" cy="62" r="52" fill="var(--amber-soft)" />}
      <g transform="translate(10 10)">
        <path
          d="M35 21 A15 15 0 0 1 65 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <rect x="29" y="20" width="42" height="9" rx="4" fill="currentColor" />
        <rect
          x="33"
          y="29"
          width="34"
          height="41"
          rx="10"
          fill={unlit ? "var(--raised)" : "var(--glass)"}
          stroke="currentColor"
          strokeWidth="6"
        />
        {unlit ? (
          <path
            d="M50 44 C55 50 56.5 53.5 55 58 A5.5 5.5 0 0 1 45 58 C43.5 53.5 45 50 50 44 Z"
            fill="var(--border-strong)"
          />
        ) : (
          <g className="flame">
            <path
              d="M50 39 C57 47 59.5 52 57.5 58 A7.5 7.5 0 0 1 42.5 58 C40.5 52 43 47 50 39 Z"
              fill="var(--amber)"
            />
            <path
              d="M50 49 C53.5 53 54.5 55.5 53.5 58.5 A3.5 3.5 0 0 1 46.5 58.5 C45.5 55.5 46.5 53 50 49 Z"
              fill="var(--flame-core)"
            />
          </g>
        )}
        <rect x="27" y="70" width="46" height="10" rx="4.5" fill="currentColor" />
      </g>
    </svg>
  );
}
