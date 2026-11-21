import type { Curve } from "./motion";

export const END_OF_REVIEW = {
  pool: 280,
  embers: 620,
  heading: 640,
  count: 820,
  countRoll: 960,
  lights: 1180,
  run: 1300,
  spark: 1500,
  land: 2100,
  hop: 2260,
  tick: 2700,
  actions: 2000,
  actionStep: 90,
} as const;

export const POOL_BLOOM_MS = 1600;

export const EMBER_DRIFT: Curve = [0.2, 0.7, 0.3, 1];

export const COUNT_ROLL: Curve = [0.25, 1, 0.5, 1];

export function countRollMs(from: number, to: number): number {
  return Math.min(1200, 500 + Math.abs(to - from) * 20);
}

const EMBERS: readonly (readonly [number, number])[] = [
  [0, 3],
  [0.25, 6],
  [0.5, 9],
  [1, 14],
  [2, 20],
];

export function emberCount(added: number, goal: number): number {
  if (added <= 0) return 0;
  const share = added / Math.max(goal, 1);
  const upper = EMBERS.findIndex(([at]) => at >= share);
  if (upper === -1) return EMBERS[EMBERS.length - 1]?.[1] ?? 0;
  const [x1, y1] = EMBERS[upper] ?? [0, 0];
  const [x0, y0] = EMBERS[upper - 1] ?? [x1, y1];
  return Math.round(x1 === x0 ? y1 : y0 + ((y1 - y0) * (share - x0)) / (x1 - x0));
}

const EMBERS_SPREAD_MS = 1400;

const spread = (i: number, step: number) => (i * step) % 1;

export interface EndEmber {
  x: number;
  y: number;
  at: number;
  dur: number;
  size: number;
}

export function endEmbers(n: number): EndEmber[] {
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round((spread(i + 1, 0.618034) - 0.5) * 56),
    y: -Math.round(96 + spread(i + 1, 0.754878) * 90),
    at: Math.round((i * Math.min(EMBERS_SPREAD_MS, 110 * n)) / n),
    dur: Math.round(1300 + spread(i + 1, 0.56984) * 900),
    size: 3 + Math.round(spread(i + 1, 0.414214) * 4) / 2,
  }));
}

export const SPARK_FLIGHT: Curve = [0.645, 0.045, 0.355, 1];

export const SPARK_MS = {
  land: END_OF_REVIEW.land - END_OF_REVIEW.spark,
  hop: END_OF_REVIEW.tick - END_OF_REVIEW.hop,
} as const;

export const SPARK_TRAIL = { dots: 6, step: 16 } as const;

export interface Point {
  x: number;
  y: number;
}

export function sparkAt(t: number, from: Point, to: Point, bend: number): Point {
  "worklet";
  const cx = (from.x + to.x) / 2 + bend;
  const cy = Math.min(from.y, to.y) + (bend > 0 ? 20 : -30);
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
    y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
  };
}

export interface Fleck {
  vx: number;
  vy: number;
  at: number;
  life: number;
  w: number;
  h: number;
  spin: number;
  phase: number;
  tone: 1 | 2 | 3;
}

export const FLECK_GRAVITY = 420;
export const FLECK_DRAG = 2;
export const FLECK_HOT_MS = 200;

export function lightBurst(n: number): Fleck[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (spread(i + 1, 0.618034) - 0.5) * 2;
    const speed = 120 + spread(i + 1, 0.754878) * 140;
    return {
      vx: Math.round(Math.cos(angle) * speed),
      vy: Math.round(Math.sin(angle) * speed),
      at: Math.round(spread(i + 1, 0.324718) * 60),
      life: Math.round(800 + spread(i + 1, 0.56984) * 500),
      w: 2.2 + Math.round(spread(i + 1, 0.414214) * 14) / 10,
      h: 4 + Math.round(spread(i + 1, 0.267949) * 25) / 10,
      spin: (i % 2 ? -1 : 1) * (5 + spread(i + 1, 0.192582) * 9),
      phase: spread(i + 1, 0.8541) * 6.28,
      tone: ([1, 2, 3, 2, 3] as const)[i % 5] ?? 3,
    };
  });
}

export function fleckAt(
  f: Fleck,
  ms: number,
): { x: number; y: number; opacity: number; turn: number } {
  "worklet";
  const age = (ms - f.at) / 1000;
  const u = (ms - f.at) / f.life;
  if (u <= 0 || u >= 1) return { x: 0, y: 0, opacity: 0, turn: 0 };
  const slow = (1 - Math.exp(-FLECK_DRAG * age)) / FLECK_DRAG;
  return {
    x: f.vx * slow,
    y: f.vy * slow + (FLECK_GRAVITY / FLECK_DRAG) * (age - slow),
    opacity: u < 0.06 ? u / 0.06 : u > 0.6 ? 1 - (u - 0.6) / 0.4 : 1,
    turn: f.phase + age * f.spin,
  };
}
