import { useIsFocused } from "expo-router";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { useAboveTabBar } from "./tab-bar";
import { ToastFloor } from "./toast-host";

// One bar floats over the screen above the tab bar, as Photos and Mail pin their selection actions.
// A screen hands it over and the root draws it, since only the root knows where the screen ends.
let bar: ReactNode = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Shows `node` floating above the tab bar while the calling screen is in front; null hides it. */
export function useFloatingBar(node: ReactNode) {
  // Another tab keeps this screen mounted behind it, so the bar leaves with the screen's focus.
  const focused = useIsFocused();
  useEffect(() => {
    bar = focused ? node : null;
    emit();
  }, [node, focused]);
  useEffect(
    () => () => {
      bar = null;
      emit();
    },
    [],
  );
}

/** Where the floating bar draws. Mounted once, in the root. */
export function FloatingBarHost() {
  const node = useSyncExternalStore(subscribe, () => bar);
  const bottom = useAboveTabBar() + 8;
  if (!node) return null;
  return (
    // A toast rises over it rather than covering it.
    <ToastFloor
      pointerEvents="box-none"
      style={{ position: "absolute", start: 16, end: 16, bottom }}
    >
      {node}
    </ToastFloor>
  );
}
