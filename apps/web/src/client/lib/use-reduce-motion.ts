import { useReducedMotion, useReducedMotionConfig } from "motion/react";

/**
 * Whether to skip motion: the learner's system setting, or a `MotionConfig` that forces it, as
 * /design's reduced-motion switch does. The app has no provider, so the config alone reads false.
 */
export function useReduceMotion(): boolean {
  const configured = useReducedMotionConfig();
  const system = useReducedMotion();
  return Boolean(configured || system);
}
