export type Ink = "metal" | "glass" | "glass-unlit" | "amber" | "flame" | "flame-core" | "ember";

export interface Shape {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  d?: string;
  fill?: Ink;
  stroke?: Ink;
  strokeWidth?: number;
  round?: boolean;
}

export const LANTERN_BOUNDS = { left: 31.5, right: 88.5, top: 15.25, bottom: 106 } as const;

export const FLAME_OUTER = {
  d: "M60 58 C66.5 64.5 73.8 73 73.8 84 C73.8 90.9 67.62 96.5 60 96.5 C52.38 96.5 46.2 90.9 46.2 84 C46.2 73 53.5 64.5 60 58 Z",
  fill: "flame",
} satisfies Shape;

export const FLAME_CORE = {
  d: "M60 71.25 C63.25 74.5 66.9 78.75 66.9 84.25 C66.9 87.7 63.81 90.5 60 90.5 C56.19 90.5 53.1 87.7 53.1 84.25 C53.1 78.75 56.75 74.5 60 71.25 Z",
  fill: "flame-core",
} satisfies Shape;

export const FLAME_CORE_BASE = 90.5;

export const FLAME_BOUNDS = { left: 44, right: 76, top: 58, bottom: 96.5 } as const;

export const EMBER = {
  d: "M60 72 C65.6 78.5 67 82 65.4 86 A5.7 5.7 0 0 1 54.6 86 C53 82 54.4 78.5 60 72 Z",
  fill: "ember",
} satisfies Shape;

export const EMBER_AT_FLAME_SIZE = "translate(60 96.45) scale(2.15) translate(-60 -89.9)";

export const LANTERN_BAIL = {
  d: "M40.5 48 A19.5 30 0 0 1 79.5 48",
  stroke: "metal",
  strokeWidth: 5.5,
} satisfies Shape;

export const LANTERN_GLASS = { x: 38.5, y: 49, w: 43, h: 46, r: 3, fill: "glass" } satisfies Shape;

export const LANTERN_FRAME: Shape[] = [
  { x: 34, y: 50, w: 5, h: 46, r: 2.5, fill: "metal" },
  { x: 81, y: 50, w: 5, h: 46, r: 2.5, fill: "metal" },
  { d: "M50 36 H70 L87 51 H33 Z", fill: "metal", stroke: "metal", strokeWidth: 3, round: true },
  { x: 37.3, y: 44.8, w: 6.4, h: 6.4, r: 3.2, fill: "metal" },
  { x: 76.3, y: 44.8, w: 6.4, h: 6.4, r: 3.2, fill: "metal" },
  { x: 31, y: 92, w: 58, h: 9, r: 4.5, fill: "metal" },
  { x: 38, y: 101, w: 44, h: 5, r: 2.5, fill: "metal" },
];

export const VENT = { x: 60, y: 38 } as const;
