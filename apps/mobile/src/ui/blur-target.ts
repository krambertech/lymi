import { createContext, type RefObject, useContext } from "react";
import type { View } from "react-native";

/** The blur target a frosted surface reads: set by BlurRoot on Android, none on iOS. */
export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}
