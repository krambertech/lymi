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
  land: 1780,
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
