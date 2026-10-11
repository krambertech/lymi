import { ease } from "./tokens.gen";

// Motion presets in Motion's shape, which the web passes straight through; the phone converts them
// for Reanimated. docs/design/system/motion.md says where each is used.

export type Curve = readonly [number, number, number, number];

/**
 * A spring. `visualDuration` is when it looks settled, and `duration` when it stops; Reanimated's
 * perceptual duration is the first, so the phone reads either as that.
 */
export type Spring = { type: "spring"; bounce: number } & (
  | { visualDuration: number }
  | { duration: number }
);

export interface Timed {
  duration: number;
  ease: Curve | "linear";
  delay?: number;
}

/** `--ease-out`: anything that enters or answers an input, the reveal included. */
export const EASE_OUT: Curve = ease.out;

const spring = (visualDuration: number, bounce = 0) =>
  ({ type: "spring", visualDuration, bounce }) as const;

/** Every flame movement, in one place so the design system reads the same numbers. */
export const FLAME_MOTION = {
  settle: spring(0.9),
  rise: spring(1.4),
  catch: spring(0.7, 0.12),
  goOut: spring(1.6),
  breathIn: spring(0.28),
  breathOut: spring(0.9),
  spark: spring(0.62),
} as const;

/** The lantern's flight to the middle of the screen at the end of a review. */
export const LANTERN_FLIGHT = spring(0.6);

/** On reveal the cue glides up while the grade strip opens, as one movement. */
export const REVEAL_GLIDE = { duration: 0.34, ease: EASE_OUT } as const satisfies Timed;

// One set of springs for checkbox, radio, switch and the chosen plate of a segmented control or pill.

export const CHOICE_POP = { type: "spring", duration: 0.32, bounce: 0.3 } as const;

/** The chosen plate's travel: about 340 ms with a trace of overshoot. */
export const CHOICE_SLIDE = { type: "spring", duration: 0.34, bounce: 0.16 } as const;

export const CHOICE_DRAW = { duration: 0.22, ease: EASE_OUT, delay: 0.05 } as const satisfies Timed;

export const CHOICE_LEAVE = { duration: 0.1, ease: EASE_OUT } as const satisfies Timed;

export const CHOICE_FADE = { duration: 0.15, ease: "linear" } as const satisfies Timed;

export const INSTANT = { duration: 0 } as const;
