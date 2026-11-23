import { useIsFocused } from "expo-router";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { useAboveTabBar } from "./tab-bar";
import { ToastFloor } from "./toast-host";

let bar: ReactNode = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useFloatingBar(node: ReactNode) {
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

export function FloatingBarHost() {
  const node = useSyncExternalStore(subscribe, () => bar);
  const bottom = useAboveTabBar() + 8;
  if (!node) return null;
  return (
    <ToastFloor
      pointerEvents="box-none"
      style={{ position: "absolute", start: 16, end: 16, bottom }}
    >
      {node}
    </ToastFloor>
  );
}
