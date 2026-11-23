import { createContext, type RefObject, useContext } from "react";
import type { View } from "react-native";

export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}
