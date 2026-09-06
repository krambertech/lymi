import type { ReactNode } from "react";

/**
 * The lantern, as data, in a 120 unit box. One source of truth: the component, the lockup and
 * scripts/brand.mjs all draw from here, so the mark cannot drift between the app and its assets.
 *
 * The parts, top to bottom: a bail tall enough to read as a handle rather than a keyring, a hood
 * that flares wide over the glass, two rods down the sides, an opaque glass, and a fount on a foot.
 * The glass is a solid colour and every metal part overlaps its edges, so the mark carries its own
 * interior and can sit on any surface without painting a hole in it.
 *
 * There is no second cut for small sizes. The rods and the flame are exactly what keep the drawing
 * legible when it is tiny; a simplified version that drops them collapses into a mushroom by 24 px.
 * One drawing, every size.
 */

export type Ink = "metal" | "glass" | "glass-unlit" | "amber" | "flame" | "flame-core" | "ember";

export interface Shape {
  /** A rounded rect (x, y, w, h, r) or a path (d). */
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  d?: string;
  fill?: Ink;
  stroke?: Ink;
  strokeWidth?: number;
  /** Round the outline of a filled path, e.g. the hood's corners. */
  round?: boolean;
}

/** Where the drawing actually sits inside the 120 box. The lockup measures from these. */
export const LANTERN_BOUNDS = { left: 31.5, right: 88.5, top: 15.25, bottom: 106 } as const;

export const FLAME: Shape[] = [
  {
    d: "M60 58 C75.36 72.3 75.84 76.56 71.4 88.2 A12 12 0 0 1 48.6 88.2 C44.16 76.56 44.64 72.3 60 58 Z",
    fill: "flame",
  },
  {
    d: "M60 70.2 C66.86 78.48 67.13 81.89 65.02 86.38 A5.28 5.28 0 0 1 54.98 86.38 C52.87 81.89 53.14 78.48 60 70.2 Z",
    fill: "flame-core",
  },
];

/**
 * The flame's own box inside the 120 unit one. The streak's Flame crops to this, so the mark and
 * the streak are one drawing rather than two that drift.
 */
export const FLAME_BOUNDS = { left: 44, right: 76, top: 58, bottom: 96.5 } as const;

export const EMBER: Shape = {
  d: "M60 72 C65.6 78.5 67 82 65.4 86 A5.7 5.7 0 0 1 54.6 86 C53 82 54.4 78.5 60 72 Z",
  fill: "ember",
};

/** The bail, drawn behind the hood so the two never merge into one blob. */
export const LANTERN_BAIL: Shape = {
  d: "M40.5 48 A19.5 30 0 0 1 79.5 48",
  stroke: "metal",
  strokeWidth: 5.5,
};

export const LANTERN_GLASS: Shape = { x: 38.5, y: 49, w: 43, h: 46, r: 3, fill: "glass" };

/** Everything painted over the glass: rods, hood, the bail's pivots, fount and foot. */
export const LANTERN_FRAME: Shape[] = [
  { x: 34, y: 50, w: 5, h: 46, r: 2.5, fill: "metal" },
  { x: 81, y: 50, w: 5, h: 46, r: 2.5, fill: "metal" },
  { d: "M50 36 H70 L87 51 H33 Z", fill: "metal", stroke: "metal", strokeWidth: 3, round: true },
  { x: 37.3, y: 44.8, w: 6.4, h: 6.4, r: 3.2, fill: "metal" },
  { x: 76.3, y: 44.8, w: 6.4, h: 6.4, r: 3.2, fill: "metal" },
  { x: 31, y: 92, w: 58, h: 9, r: 4.5, fill: "metal" },
  { x: 38, y: 101, w: 44, h: 5, r: 2.5, fill: "metal" },
];

const PAINT: Record<Ink, string> = {
  metal: "currentColor",
  glass: "var(--glass)",
  "glass-unlit": "var(--glass-unlit)",
  amber: "var(--amber)",
  flame: "var(--amber)",
  "flame-core": "var(--flame-core)",
  ember: "var(--edge-2)",
};

function draw(s: Shape, key: string, className?: string) {
  const common = {
    fill: s.fill ? PAINT[s.fill] : "none",
    ...(s.stroke ? { stroke: PAINT[s.stroke], strokeWidth: s.strokeWidth } : {}),
    ...(s.round ? { strokeLinejoin: "round" as const } : {}),
    ...(s.stroke && !s.fill ? { strokeLinecap: "round" as const } : {}),
    ...(className ? { className } : {}),
  };
  return s.d ? (
    <path key={key} d={s.d} {...common} />
  ) : (
    <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...common} />
  );
}

/** The flame alone. The lantern wears it, and the streak borrows the same drawing. */
export function FLAME_PARTS(): ReactNode {
  return (
    <g className="flame">
      {draw(FLAME[0] as Shape, "flame")}
      {draw(FLAME[1] as Shape, "core", "flame-core")}
    </g>
  );
}

/** The flame, or the ember that replaces it when nothing is due. Wears the glow. */
function light(lit: boolean) {
  return (
    <g className="lantern-light" key="light">
      {lit ? FLAME_PARTS() : draw(EMBER, "ember")}
    </g>
  );
}

export function LANTERN_PARTS(lit: boolean): ReactNode {
  return (
    <>
      <g className="lantern-bail" key="bail">
        {draw(LANTERN_BAIL, "bail")}
      </g>
      {draw({ ...LANTERN_GLASS, fill: lit ? "glass" : "glass-unlit" }, "glass")}
      {light(lit)}
      {LANTERN_FRAME.map((s, i) => draw(s, `frame-${i}`))}
    </>
  );
}
