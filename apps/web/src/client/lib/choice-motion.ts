import type { Transition } from "motion/react";

// The springs checkbox, radio, switch and toggle group share, so a choice lands the same way in all four. DESIGN.md "Motion".

/** A mark arriving: quick, with a trace of overshoot so it reads as caught rather than set. */
export const CHOICE_POP: Transition = { type: "spring", duration: 0.32, bounce: 0.3 };

/** Something travelling to its new place, settling without wobbling past it. */
export const CHOICE_SLIDE: Transition = { type: "spring", duration: 0.34, bounce: 0.16 };

/** A check drawing across once the box has caught. */
export const CHOICE_DRAW: Transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: 0.05 };

/** Leaving is quicker than arriving. */
export const CHOICE_LEAVE: Transition = { duration: 0.1, ease: [0.22, 1, 0.36, 1] };

/** Under reduced motion a choice crossfades in place. */
export const CHOICE_FADE: Transition = { duration: 0.15, ease: "linear" };

export const INSTANT: Transition = { duration: 0 };
