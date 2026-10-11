import { createContext, type ReactNode, useContext } from "react";

// Whether a view sits on Liquid Glass, where fills let the glass through instead of covering it.
// surfaces.md "On glass".

const OnGlassContext = createContext(false);

export function OnGlass({ children }: { children: ReactNode }) {
  return <OnGlassContext.Provider value>{children}</OnGlassContext.Provider>;
}

export function useOnGlass() {
  return useContext(OnGlassContext);
}
