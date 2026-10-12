import { useCallback, useRef, useSyncExternalStore } from "react";
import type { View } from "react-native";

export type Screen = "today" | "welcome";

/** Where the screen under the splash keeps its lantern, in window points: its centre and size. */
export interface Spot {
  screen: Screen;
  x: number;
  y: number;
  size: number;
  /** The flame's size there, so the splash's flame settles on it. */
  flame: number;
}

let spot: Spot | null = null;
let flying = false;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The lantern's spot on the screen the splash lands on, once that screen has laid it out. */
export function useSpot() {
  return useSyncExternalStore(subscribe, () => spot);
}

/** While the splash carries its lantern in, the lantern it lands on waits hidden, so there are never two. */
export function setFlying(on: boolean) {
  flying = on;
  for (const l of listeners) l();
}

export function useFlying() {
  return useSyncExternalStore(subscribe, () => flying);
}

/** Marks a lantern of `size` as where the splash lands: Today's, or Welcome's when signed out. */
export function useLandingSpot(screen: Screen, size: number, flame = 1) {
  const ref = useRef<View>(null);
  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      const next = { screen, x: x + w / 2, y: y + h / 2, size, flame };
      if (
        spot &&
        spot.screen === screen &&
        spot.x === next.x &&
        spot.y === next.y &&
        spot.flame === flame
      )
        return;
      spot = next;
      for (const l of listeners) l();
    });
  }, [screen, size, flame]);
  const hidden = useFlying();
  return { ref, onLayout, style: { opacity: hidden ? 0 : 1 } };
}
