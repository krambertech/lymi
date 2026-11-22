import { ease } from "./tokens.gen";

export type Curve = readonly [number, number, number, number];

export type Spring = { type: "spring"; bounce: number } & (
  | { visualDuration: number }
  | { duration: number }
);

export interface Timed {
  duration: number;
  ease: Curve | "linear";
  delay?: number;
}

export const EASE_OUT: Curve = ease.out;

const spring = (visualDuration: number, bounce = 0) =>
  ({ type: "spring", visualDuration, bounce }) as const;

export const FLAME_MOTION = {
  settle: spring(0.9),
  rise: spring(1.4),
  catch: spring(0.7, 0.12),
  goOut: spring(1.6),
  breathIn: spring(0.28),
  breathOut: spring(0.9),
  spark: spring(0.62),
} as const;

export const ARRIVE = spring(0.4, 0.1);

export const SNAP_BACK = spring(0.36);

export const LANTERN_FLIGHT = spring(0.6);

export const DIGIT_ROLL = { type: "spring", visualDuration: 0.36, bounce: 0.18 } as const;

export const REVEAL_GLIDE = { duration: 0.34, ease: EASE_OUT } as const satisfies Timed;

export const CHOICE_POP = { type: "spring", duration: 0.32, bounce: 0.3 } as const;

export const CHOICE_SLIDE = { type: "spring", duration: 0.34, bounce: 0.16 } as const;

export const CHOICE_DRAW = { duration: 0.22, ease: EASE_OUT, delay: 0.05 } as const satisfies Timed;

export const CHOICE_LEAVE = { duration: 0.1, ease: EASE_OUT } as const satisfies Timed;

export const CHOICE_FADE = { duration: 0.15, ease: "linear" } as const satisfies Timed;

export const INSTANT = { duration: 0 } as const;

export const SPEAKER_WAVES = {
  loop: { duration: 0.9, ease: "linear" },
  start: { duration: 0.2, ease: EASE_OUT },
  settle: { duration: 0.14, ease: EASE_OUT },
} as const satisfies Record<string, Timed>;

export const PLATE_ARRIVE = { duration: 0.2, ease: EASE_OUT } as const satisfies Timed;
export const PLATE_RISE = 6;

export const READING_FADE = { duration: 0.2, ease: EASE_OUT } as const satisfies Timed;

export const CHIPS_LEAVE = { duration: 0.16, ease: "linear" } as const satisfies Timed;
export const CHIP_RETURN = { duration: 0.22, ease: EASE_OUT } as const satisfies Timed;
export const CHIP_STAGGER = 0.03;
export const CHIP_RISE = 8;
