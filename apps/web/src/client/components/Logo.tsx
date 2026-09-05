import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { Lantern } from "./Lantern";
import { WORDMARK } from "./wordmark-paths";

const EM = 100; // wordmark units per em

/** Lantern drawing, in its own 120-unit box, as raw SVG children. Shared by Lockup and the brand script. */
function lanternPaths(flame: boolean) {
  return (
    <>
      <path
        d="M43 22 A17 17 0 0 1 77 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <rect x="35.75" y="22" width="48.5" height="59" rx="6" fill="currentColor" />
      <rect x="35" y="19.25" width="50" height="6.5" rx="3.25" fill="currentColor" />
      <rect x="33" y="77.25" width="54" height="6.5" rx="3.25" fill="currentColor" />
      <rect x="42.25" y="25.75" width="35.5" height="51.5" rx="5" fill="var(--canvas)" />
      <rect x="42.25" y="25.75" width="35.5" height="51.5" rx="5" fill="var(--amber-soft)" />
      {flame && (
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
    </>
  );
}

interface WordmarkProps {
  /** Font size in px. The box is 1.275× this, like a line of type. */
  size?: number | undefined;
  /** Replace the dot of the i with a flame. The lit wordmark, for login and the store. */
  flame?: boolean | undefined;
  className?: string | undefined;
  title?: string | undefined;
}

/**
 * "lymi" in Onest 600, drawn as paths so it renders before fonts load and exports as SVG.
 * The metal takes currentColor.
 */
export function Wordmark({ size = 24, flame = false, className, title }: WordmarkProps) {
  const { width, top, bottom, scale, glyphs, dot } = WORDMARK;
  const h = bottom - top;
  const k = size / EM;
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };
  return (
    <svg
      viewBox={`0 ${top} ${width} ${h}`}
      width={width * k}
      height={h * k}
      className={clsx(
        "shrink-0 select-none overflow-visible",
        !title && "pointer-events-none",
        className,
      )}
      {...a11y}
    >
      {title && <title>{title}</title>}
      <g fill="currentColor">
        {glyphs.map((g) => (
          <path
            key={`${g.ch}-${g.x}`}
            transform={`translate(${g.x} 0) scale(${scale} ${-scale})`}
            d={g.d}
          />
        ))}
        {!flame && <path transform={`translate(${dot.x} 0) scale(${scale} ${-scale})`} d={dot.d} />}
      </g>
      {flame && (
        <g className="flame">
          <path d={WORDMARK.flame} fill="var(--amber)" />
          <path d={WORDMARK.flameCore} fill="var(--flame-core)" />
        </g>
      )}
    </svg>
  );
}

/** Geometry of the row lockup, in wordmark units (100 per em). Shared with scripts/brand.mjs. */
export const LOCKUP = (() => {
  const L = 138; // lantern box height: 1.38em, so the metal stands a little taller than the l
  const s = L / 120;
  const visualLeft = 33 * s;
  const visualRight = 87 * s;
  const footBottom = 83.75 * s;
  const gap = 17; // 0.17em between metal and the l
  const textX = visualRight - visualLeft + gap;
  return {
    L,
    s,
    lanternX: -visualLeft,
    lanternY: -footBottom, // base sits on the baseline
    textX,
    width: textX + WORDMARK.width,
    top: Math.min(WORDMARK.top, 5 * s - footBottom) - 2,
    bottom: WORDMARK.bottom,
  };
})();

interface LockupProps {
  /** Font size of the wordmark in px. The lantern scales with it. */
  size?: number | undefined;
  flicker?: boolean | undefined;
  glow?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  title?: string | undefined;
}

/**
 * Lantern and wordmark as one drawing, so they can never drift apart. The lantern's foot sits
 * on the baseline and its cap reaches just above the l. Clear space: half a lantern on every side.
 */
export function Lockup({
  size = 24,
  flicker,
  glow,
  className,
  style,
  title = "Lymi",
}: LockupProps) {
  const k = size / EM;
  const { L, s, lanternX, lanternY, textX, width, top, bottom } = LOCKUP;
  const h = bottom - top;
  return (
    <svg
      viewBox={`0 ${top} ${width} ${h}`}
      width={width * k}
      height={h * k}
      className={clsx(
        "lantern shrink-0 select-none overflow-visible text-text",
        flicker && "lantern-flicker",
        className,
      )}
      style={style}
      role="img"
      aria-label={title}
    >
      <g
        className={clsx("text-metal", glow && "glow")}
        transform={`translate(${lanternX} ${lanternY}) scale(${s})`}
        style={{ height: L }}
      >
        {lanternPaths(true)}
      </g>
      <g fill="currentColor" transform={`translate(${textX} 0)`}>
        {WORDMARK.glyphs.map((g) => (
          <path
            key={`${g.ch}-${g.x}`}
            transform={`translate(${g.x} 0) scale(${WORDMARK.scale} ${-WORDMARK.scale})`}
            d={g.d}
          />
        ))}
        <path
          transform={`translate(${WORDMARK.dot.x} 0) scale(${WORDMARK.scale} ${-WORDMARK.scale})`}
          d={WORDMARK.dot.d}
        />
      </g>
    </svg>
  );
}

interface AppTileProps {
  /** Tile size in px. Corner radius follows iOS at 22.4%. */
  size?: number | undefined;
  glow?: boolean | undefined;
  className?: string | undefined;
  title?: string | undefined;
}

/**
 * The app icon: always the dark room, whatever the theme. A warm centre behind the flame is the
 * one gradient Lymi allows, because an icon is a picture of the lantern, not a surface.
 */
export function AppTile({ size = 28, glow = true, className, title }: AppTileProps) {
  const a11y = title ? { role: "img" as const } : { "aria-hidden": true as const };
  // The drawing spans y 5 to 83.75 of its 120 box. The handle is thin, so centre on the body plus
  // half the handle (about y 49) rather than the full box: shift down 11/120.
  const box = size * 0.96;
  return (
    <span
      data-theme="dark"
      className={clsx(
        "grid shrink-0 place-items-center overflow-hidden bg-canvas text-metal",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.224),
        backgroundImage:
          "radial-gradient(circle at 50% 50%, oklch(0.8 0.15 74 / 0.22), transparent 62%)",
      }}
      {...a11y}
    >
      {title && <span className="sr-only">{title}</span>}
      <Lantern
        glow={glow}
        style={
          {
            width: box,
            height: box,
            transform: `translateY(${((box * 11) / 120).toFixed(2)}px)`,
            "--glow-r": `${Math.max(4, size / 9)}px`,
          } as CSSProperties
        }
      />
    </span>
  );
}
