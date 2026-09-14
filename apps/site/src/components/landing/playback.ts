import { useEffect, useRef, useState } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** A demo element's resting state once its beat has come, and before. */
export const appear = (visible: boolean) => ({
  opacity: visible ? 1 : 0,
  y: visible ? 0 : 10,
  filter: visible ? "blur(0px)" : "blur(6px)",
});

/**
 * A scripted demo that plays once while on screen and pauses when scrolled away. `beats` are ms
 * from the start; reduced motion shows the last beat at once.
 */
export function usePlayback<Beat extends string>(
  beats: Record<Beat, number>,
  inView: boolean,
  still: boolean | null,
) {
  const end = Math.max(...Object.values<number>(beats));
  const [reached, setReached] = useState(0);
  // Exact ms played, kept across pauses so a resume waits only for the rest of the current beat.
  const played = useRef(0);

  useEffect(() => {
    if (still || !inView || played.current >= end) return;
    const startedAt = performance.now() - played.current;
    const timers = Object.values<number>(beats)
      .filter((at) => at > played.current)
      .map((at) =>
        window.setTimeout(() => setReached((r) => Math.max(r, at)), at - played.current),
      );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      played.current = Math.min(end, performance.now() - startedAt);
    };
  }, [beats, end, inView, still]);

  return {
    at: (beat: Beat) => !!still || reached >= beats[beat],
  };
}
