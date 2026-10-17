import { BlurTargetView } from "expo-blur";
import { type ReactNode, useRef } from "react";
import type { View } from "react-native";
import { BlurTargetContext } from "./blur-target";

/**
 * Android blurs only what sits inside a blur target in the same window, so the screens are wrapped
 * in one, and what floats over them, such as the open menu, points at it.
 */
export function BlurRoot({ children, over }: { children: ReactNode; over?: ReactNode }) {
  const ref = useRef<View>(null);
  return (
    <BlurTargetContext.Provider value={ref}>
      <BlurTargetView ref={ref} style={{ flex: 1 }}>
        {children}
      </BlurTargetView>
      {over}
    </BlurTargetContext.Provider>
  );
}
