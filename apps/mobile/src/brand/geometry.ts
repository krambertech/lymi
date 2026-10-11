// The lantern's drawing and the flame's sizes, copied from apps/web's lantern-geometry.tsx and
// lib/flame.ts. The proposal moves both into a shared package so the mark cannot drift.

export type Ink = "metal" | "glass" | "glass-unlit" | "flame" | "flame-core" | "ember";

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

export const FLAME_OUTER =
  "M60 58 C66.5 64.5 73.8 73 73.8 84 C73.8 90.9 67.62 96.5 60 96.5 C52.38 96.5 46.2 90.9 46.2 84 C46.2 73 53.5 64.5 60 58 Z";
export const FLAME_CORE =
  "M60 71.25 C63.25 74.5 66.9 78.75 66.9 84.25 C66.9 87.7 63.81 90.5 60 90.5 C56.19 90.5 53.1 87.7 53.1 84.25 C53.1 78.75 56.75 74.5 60 71.25 Z";
export const EMBER =
  "M60 72 C65.6 78.5 67 82 65.4 86 A5.7 5.7 0 0 1 54.6 86 C53 82 54.4 78.5 60 72 Z";

export const FLAME_BOUNDS = { left: 44, right: 76, top: 58, bottom: 96.5 } as const;

export const BAIL = "M40.5 48 A19.5 30 0 0 1 79.5 48";
export const GLASS = { x: 38.5, y: 49, w: 43, h: 46, r: 3 } as const;

export const FRAME: Shape[] = [
  { x: 34, y: 50, w: 5, h: 46, r: 2.5 },
  { x: 81, y: 50, w: 5, h: 46, r: 2.5 },
  { d: "M50 36 H70 L87 51 H33 Z", strokeWidth: 3, round: true },
  { x: 37.3, y: 44.8, w: 6.4, h: 6.4, r: 3.2 },
  { x: 76.3, y: 44.8, w: 6.4, h: 6.4, r: 3.2 },
  { x: 31, y: 92, w: 58, h: 9, r: 4.5 },
  { x: 38, y: 101, w: 44, h: 5, r: 2.5 },
];

/** How tall the flame stands. 0 is out and 1 is the brand flame. */
export const FLAME_SIZE = { out: 0, start: 0.72, nearly: 1.02, full: 1.16 } as const;

export function flameSize(progress: number | undefined, out = false): number {
  if (out) return FLAME_SIZE.out;
  if (progress === undefined) return 1;
  if (progress >= 1) return FLAME_SIZE.full;
  const p = Math.max(0, progress) ** 0.75;
  return FLAME_SIZE.start + (FLAME_SIZE.nearly - FLAME_SIZE.start) * p;
}

/** Embers a grade throws out of the hood: where each drifts in the 120 box, when it leaves, its px. */
export const FLAME_SPARKS = [
  [
    { x: -12, y: -34, at: 0, px: 3.5 },
    { x: 9, y: -42, at: 70, px: 3 },
  ],
  [
    { x: 6, y: -38, at: 0, px: 3.5 },
    { x: -15, y: -28, at: 50, px: 3 },
    { x: 17, y: -24, at: 120, px: 2.5 },
  ],
  [
    { x: -3, y: -44, at: 0, px: 3.5 },
    { x: 14, y: -31, at: 80, px: 3 },
  ],
] as const;

export const VENT = { x: 60, y: 38 } as const;
