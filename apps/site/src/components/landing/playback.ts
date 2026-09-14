import { useEffect, useRef, useState } from "react";

/** Whether an element is on screen, so an animation nobody can see waits. */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), {
      threshold: 0.35,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

/**
 * A scripted demo that plays once while on screen, pauses when scrolled away, and replays on
 * request. `beats` are ms from the start; reduced motion shows the last beat at once.
 */
export function usePlayback<Beat extends string>(
  beats: Record<Beat, number>,
  inView: boolean,
  still: boolean | null,
) {
  const end = Math.max(...Object.values<number>(beats));
  const [run, setRun] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resumes from where a pause left `elapsed`; a new `run` replays
  useEffect(() => {
    if (still || !inView || elapsed >= end) return;
    const timers = Object.values<number>(beats)
      .filter((at) => at > elapsed)
      .map((at) => window.setTimeout(() => setElapsed((e) => Math.max(e, at)), at - elapsed));
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [inView, still, run]);

  return {
    at: (beat: Beat) => !!still || elapsed >= beats[beat],
    done: !!still || elapsed >= end,
    replay: () => {
      setElapsed(0);
      setRun((r) => r + 1);
    },
  };
}
