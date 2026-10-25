/**
 * The lantern, as data, in a 120 unit box. One source of truth: the web, the site and the phone
 * draw from here, so the mark cannot drift between them.
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

export const FLAME_OUTER = {
  d: "M60 58 C66.5 64.5 73.8 73 73.8 84 C73.8 90.9 67.62 96.5 60 96.5 C52.38 96.5 46.2 90.9 46.2 84 C46.2 73 53.5 64.5 60 58 Z",
  fill: "flame",
} satisfies Shape;

export const FLAME_CORE = {
  d: "M60 71.25 C63.25 74.5 66.9 78.75 66.9 84.25 C66.9 87.7 63.81 90.5 60 90.5 C56.19 90.5 53.1 87.7 53.1 84.25 C53.1 78.75 56.75 74.5 60 71.25 Z",
  fill: "flame-core",
} satisfies Shape;

/**
 * What gives the flat flame its depth, in the 120 unit box. The amber is an elliptical radial from
 * `flame-heart` by the core through `amber` to `flame-rim` at the edge, and the core's light spills
 * into it: the core again, scaled about its base, faint and feathered under the sharp one.
 */
export const FLAME_DEPTH = {
  body: { cx: 60, cy: 86.5, rx: 17.1, ry: 23.9, stops: [0, 0.55, 1] },
  spill: { scaleX: 1.3, scaleY: 1.22, opacity: 0.45, blur: 1.8 },
} as const;

/** Where the flame's core sits, the point it flickers from; the flame itself grows from its bounds' bottom. */
export const FLAME_CORE_BASE = 90.5;

/**
 * The flame's own box inside the 120 unit one. The streak's Flame crops to this, so the mark and
 * the streak are one drawing rather than two that drift.
 */
export const FLAME_BOUNDS = { left: 44, right: 76, top: 58, bottom: 96.5 } as const;

export const EMBER = {
  d: "M60 72 C65.6 78.5 67 82 65.4 86 A5.7 5.7 0 0 1 54.6 86 C53 82 54.4 78.5 60 72 Z",
  fill: "ember",
} satisfies Shape;

/** The ember scaled about its base to the flame's height, for the streak's Flame, where the lantern's ember is a speck. */
export const EMBER_AT_FLAME_SIZE = "translate(60 96.45) scale(2.15) translate(-60 -89.9)";

/** The bail, drawn behind the hood so the two never merge into one blob. */
export const LANTERN_BAIL = {
  d: "M40.5 48 A19.5 30 0 0 1 79.5 48",
  stroke: "metal",
  strokeWidth: 5.5,
} satisfies Shape;

export const LANTERN_GLASS = { x: 38.5, y: 49, w: 43, h: 46, r: 3, fill: "glass" } satisfies Shape;

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

/** Where the embers leave the lantern: the top of the hood, where a real one vents. */
export const VENT = { x: 60, y: 38 } as const;
