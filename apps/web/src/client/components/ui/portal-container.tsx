import { createContext, useContext } from "react";

/**
 * Where an overlay renders. The app leaves it unset, so overlays go to `body`; a `/design` canvas
 * passes a layer carrying its own theme and motion, so an opened overlay matches the canvas.
 */
export const PortalContainer = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainer) ?? undefined;
}
