import { isGlassEffectAPIAvailable } from "expo-glass-effect";
import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

let reduceTransparency = false;
const listeners = new Set<() => void>();
const setReduceTransparency = (on: boolean) => {
  reduceTransparency = on;
  for (const l of listeners) l();
};
AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const available = isGlassEffectAPIAvailable();

/**
 * Whether chrome is drawn in Liquid Glass: iOS 26 or later with Reduce Transparency off, following
 * the setting while the app runs. Otherwise chrome takes the web's opaque surfaces. phone.md "Glass".
 */
export function useGlass() {
  const reduce = useSyncExternalStore(subscribe, () => reduceTransparency);
  return available && !reduce;
}
