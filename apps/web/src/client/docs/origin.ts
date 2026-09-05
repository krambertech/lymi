/**
 * The docs are served by the same Worker as the API, so the examples can use the origin the
 * reader is already on. That keeps localhost, workers.dev and the real domain all correct
 * with nothing to update by hand.
 */
export const ORIGIN = typeof window === "undefined" ? "https://lymi.app" : window.location.origin;
