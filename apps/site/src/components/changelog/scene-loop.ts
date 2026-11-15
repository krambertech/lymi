import { useInView } from "motion/react";
import { type RefObject, useEffect, useState } from "react";
import { useStill } from "../landing/playback";

/** A short scene that repeats while on screen. `beats` are ms from the start; reduced motion holds the last beat. */
export function useSceneLoop<Beat extends string>(
  beats: Record<Beat, number>,
  length: number,
  ref: RefObject<Element | null>,
) {
  const still = useStill();
  const inView = useInView(ref, { amount: 0.4 });
  const [reached, setReached] = useState(-1);

  useEffect(() => {
    if (still || !inView) return;
    let timers: number[] = [];
    const run = () => {
      setReached(0);
      timers = Object.values<number>(beats).map((at) =>
        window.setTimeout(() => setReached(at), at),
      );
      timers.push(window.setTimeout(run, length));
    };
    run();
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [beats, length, inView, still]);

  return { still, at: (beat: Beat) => still || reached >= beats[beat] };
}
