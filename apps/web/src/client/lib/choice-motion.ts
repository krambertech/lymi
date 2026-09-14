import type { Transition } from "motion/react";

// One set of springs for checkbox, radio, switch and toggle group; DESIGN.md "Motion" says how each uses them.

export const CHOICE_POP: Transition = { type: "spring", duration: 0.32, bounce: 0.3 };

export const CHOICE_SLIDE: Transition = { type: "spring", duration: 0.34, bounce: 0.16 };

export const CHOICE_DRAW: Transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: 0.05 };

export const CHOICE_LEAVE: Transition = { duration: 0.1, ease: [0.22, 1, 0.36, 1] };

export const CHOICE_FADE: Transition = { duration: 0.15, ease: "linear" };

export const INSTANT: Transition = { duration: 0 };
