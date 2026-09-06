/**
 * One place to ask whether the reader wants motion. The landing page animates by default,
 * so every moving part checks this and falls back to a still frame that says the same thing.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
