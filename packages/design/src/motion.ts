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

/** Something that arrives in place, such as a toast or an added mark: settled in 400 ms, a trace of overshoot. */
export const ARRIVE = spring(0.4, 0.1);

/** Whatever a drag let go of returning to rest, such as a card or a toast not pulled far enough. */
export const SNAP_BACK = spring(0.36);

/** The lantern's flight to the middle of the screen at the end of a review. */
export const LANTERN_FLIGHT = spring(0.6);

/** Each digit of a number that changes in view settles on this, with a trace of overshoot. */
export const DIGIT_ROLL = { type: "spring", visualDuration: 0.36, bounce: 0.18 } as const;

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

/** A pronunciation playing: its speaker's waves light one after the other, outward, on this loop. */
export const SPEAKER_WAVES = {
  loop: { duration: 0.9, ease: "linear" },
  start: { duration: 0.2, ease: EASE_OUT },
  settle: { duration: 0.14, ease: EASE_OUT },
} as const satisfies Record<string, Timed>;

/** A card or plate arriving in place, such as a field a chip adds: a 6 px rise. */
export const PLATE_ARRIVE = { duration: 0.2, ease: EASE_OUT } as const satisfies Timed;
export const PLATE_RISE = 6;

/** Furigana coming over a term at the reveal, or leaving it, in place: a fade. */
export const READING_FADE = { duration: 0.2, ease: EASE_OUT } as const satisfies Timed;

/**
 * A row of chips under a sheet that opens over them: they sink and fade together as it rises, then
 * return one after another as it goes, each rising into place a little after the one before.
 */
export const CHIPS_LEAVE = { duration: 0.16, ease: "linear" } as const satisfies Timed;
export const CHIP_RETURN = { duration: 0.22, ease: EASE_OUT } as const satisfies Timed;
export const CHIP_STAGGER = 0.03;
export const CHIP_RISE = 8;
