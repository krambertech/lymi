import type { Curve } from "./motion";

// The end of a review: one sequence the web and the phone play from the same numbers.
// docs/design/system/motion.md "The end of a review".

/** When each part of the end arrives, in ms after the last grade. */
export const END_OF_REVIEW = {
  pool: 280,
  embers: 620,
  heading: 640,
  count: 820,
  countRoll: 960,
  lights: 1180,
  run: 1300,
  /** When the day has just turned: a spark leaves the flame for today's light… */
  spark: 1500,
  /** …lands, and today's light fills… */
  land: 2100,
  /** …then a smaller one hops on to the run's flame, which catches as the run ticks. */
  hop: 2260,
  tick: 2700,
  actions: 2000,
  actionStep: 90,
} as const;

/** The pool of light blooms over this long, then breathes on the flicker's loop. */
export const POOL_BLOOM_MS = 1600;

/** An ember's drift: fast off the flame, slowing as it fades. */
export const EMBER_DRIFT: Curve = [0.2, 0.7, 0.3, 1];

/** The count's roll: quick at first, settling on the day's number. */
export const COUNT_ROLL: Curve = [0.25, 1, 0.5, 1];

/** How long the count rolls for a given rise, in ms. */
export function countRollMs(from: number, to: number): number {
  return Math.min(1200, 500 + Math.abs(to - from) * 20);
}

/** Embers at a share of the goal added; between the points the count follows a line. */
const EMBERS: readonly (readonly [number, number])[] = [
  [0, 3],
  [0.25, 6],
  [0.5, 9],
  [1, 14],
  [2, 20],
];

/** How many embers an end throws: 3 for one review, 14 for a goal's worth, 20 at most. */
export function emberCount(added: number, goal: number): number {
  if (added <= 0) return 0;
  const share = added / Math.max(goal, 1);
  const upper = EMBERS.findIndex(([at]) => at >= share);
  if (upper === -1) return EMBERS[EMBERS.length - 1]?.[1] ?? 0;
  const [x1, y1] = EMBERS[upper] ?? [0, 0];
  const [x0, y0] = EMBERS[upper - 1] ?? [x1, y1];
  return Math.round(x1 === x0 ? y1 : y0 + ((y1 - y0) * (share - x0)) / (x1 - x0));
}

/** The last ember leaves by then, however many there are. */
const EMBERS_SPREAD_MS = 1400;

/** Steps through [0, 1) by a golden ratio, so embers never bunch however many there are. */
const spread = (i: number, step: number) => (i * step) % 1;

export interface EndEmber {
  /** Where it drifts to from the flame, in px. */
  x: number;
  y: number;
  /** When it leaves, in ms after the embers start, and how long it lasts. */
  at: number;
  dur: number;
  /** Its diameter in px. */
  size: number;
}

/** The embers an end throws off the flame, each with its own drift, start and size. */
export function endEmbers(n: number): EndEmber[] {
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round((spread(i + 1, 0.618034) - 0.5) * 56),
    y: -Math.round(96 + spread(i + 1, 0.754878) * 90),
    at: Math.round((i * Math.min(EMBERS_SPREAD_MS, 110 * n)) / n),
    dur: Math.round(1300 + spread(i + 1, 0.56984) * 900),
    size: 3 + Math.round(spread(i + 1, 0.414214) * 4) / 2,
  }));
}

/** The spark's flight: slow off the flame, quick through the middle, settling into the light. */
export const SPARK_FLIGHT: Curve = [0.645, 0.045, 0.355, 1];

/** How long each leg of the spark takes: from the flame to today's light, and on to the run's flame. */
export const SPARK_MS = {
  land: END_OF_REVIEW.land - END_OF_REVIEW.spark,
  hop: END_OF_REVIEW.tick - END_OF_REVIEW.hop,
} as const;

/** The spark's trail: this many dots, each this many ms behind the one before. */
export const SPARK_TRAIL = { dots: 6, step: 16 } as const;

export interface Point {
  x: number;
  y: number;
}

/**
 * Where a spark is at `t` (0 to 1, already eased) on its way from one point to another, along a
 * curve that leans `bend` px toward the end edge: the first leg swings out and drops into the
 * light, the hop arcs up over the gap.
 */
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
  /** Its launch, in px a second, and its pull downward. */
  vx: number;
  vy: number;
  /** When it leaves, in ms after the spark lands, and how long it lasts. */
  at: number;
  life: number;
  /** Its size in px, as a small rounded rectangle that tumbles. */
  w: number;
  h: number;
  /** Turns a second, and where it starts. */
  spin: number;
  phase: number;
  /** Which of the light's three steps it is: 1 and 2 are the middle steps, 3 the flame's white. */
  tone: 1 | 2 | 3;
}

/** Flecks fall at this many px a second squared and slow at this rate a second. */
export const FLECK_GRAVITY = 420;
export const FLECK_DRAG = 2;
/** A fleck is lit for this long after it leaves, then flat. */
export const FLECK_HOT_MS = 200;

/** The flecks today's light throws as the spark lands in it, fanned upward. */
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

/** Where a fleck is `ms` after it leaves, from where it left, and how strongly it shows. */
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
