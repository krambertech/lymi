import { createContext, type ReactNode, useContext } from "react";

const OnGlassContext = createContext(false);

export function OnGlass({ children }: { children: ReactNode }) {
  return <OnGlassContext.Provider value>{children}</OnGlassContext.Provider>;
}

export function useOnGlass() {
  return useContext(OnGlassContext);
}
