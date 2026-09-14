import { clsx } from "clsx";
import type { CSSProperties } from "react";
import { Lantern } from "./lantern";
import { LANTERN_BOUNDS, LANTERN_PARTS } from "./lantern-geometry";
import { WORDMARK } from "./wordmark-paths";

const EM = 100; // wordmark units per em

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
  const { left, right, top: drawTop, bottom: foot } = LANTERN_BOUNDS;
  // Size the lantern so its bail clears the l's ascender (-97) by a few units, the way the metal
  // should stand a little taller than the letter beside it.
  const L = 130; // lantern box height in wordmark units
  const s = L / 120;
  const visualLeft = left * s;
  const visualRight = right * s;
  const footBottom = foot * s;
  const gap = 17; // 0.17em between metal and the l
  const textX = visualRight - visualLeft + gap;
  return {
    L,
    s,
    lanternX: -visualLeft,
    lanternY: -footBottom, // foot sits on the baseline
    textX,
    width: textX + WORDMARK.width,
    top: Math.min(WORDMARK.top, drawTop * s - footBottom) - 2,
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
        className={clsx("lantern-body text-metal", glow && "glow")}
        transform={`translate(${lanternX} ${lanternY}) scale(${s})`}
        style={{ height: L }}
      >
        {LANTERN_PARTS(true)}
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
  const a11y = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };
  // The drawing spans y 15.25 to 106 of its 120 box, which is centred closely enough that the
  // tile needs no nudge: the margins come out at about 14 % top and bottom.
  const box = size * 0.94;
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
      <Lantern
        glow={glow}
        style={
          {
            width: box,
            height: box,
            "--glow-r": `${Math.max(4, size / 9)}px`,
          } as CSSProperties
        }
      />
    </span>
  );
}
