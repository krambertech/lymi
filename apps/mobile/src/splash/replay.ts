import { useSyncExternalStore } from "react";
import { Linking } from "react-native";

// Development builds only: replays the splash without a cold start, from the dev menu or
// `xcrun simctl openurl <device> "lymi://today?splash"`.

let replays = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function replaySplash() {
  replays += 1;
  for (const l of listeners) l();
}

/** Bumps each time the splash is replayed. */
export function useReplays() {
  return useSyncExternalStore(subscribe, () => replays);
}

if (__DEV__) {
  Linking.addEventListener("url", ({ url }) => {
    if (url.includes("splash")) replaySplash();
  });
}
