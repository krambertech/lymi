import { useReducedMotion } from "motion/react";
import { type FocusEvent, type PointerEvent, useEffect, useRef, useState } from "react";

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

/**
 * Reduced motion, read only after hydration: the prerendered HTML is always the moving version, so a
 * still first render would mismatch it and React would leave the stale attributes in place.
 */
export function useStill(): boolean {
  const reduce = useReducedMotion();
  const [still, setStill] = useState(false);
  useEffect(() => setStill(Boolean(reduce)), [reduce]);
  return still;
}

/**
 * Whether the visitor is holding the stage: pointing at the tray or the list, or tabbing through
 * them. Only a pointer that moves counts, so a page scrolled under a resting cursor keeps playing.
 */
export function useHold() {
  const [pointer, setPointer] = useState(false);
  const [keys, setKeys] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  return {
    held: pointer || keys,
    handlers: {
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== "mouse") return;
        const moved = !last.current || last.current.x !== e.clientX || last.current.y !== e.clientY;
        last.current = { x: e.clientX, y: e.clientY };
        if (moved) setPointer(true);
      },
      onPointerLeave: () => {
        last.current = null;
        setPointer(false);
      },
      onFocus: (e: FocusEvent<HTMLElement>) => setKeys(e.target.matches(":focus-visible")),
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeys(false);
      },
    },
  };
}
