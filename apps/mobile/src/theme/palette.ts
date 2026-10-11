import { palette, shadows } from "@lymi/design";
import { useUniwind } from "uniwind";

export type Room = "light" | "dark";

/** The room this view is drawn in: the phone's, or the one a design canvas scopes it to. */
export function useRoom(): Room {
  return useUniwind().theme === "dark" ? "dark" : "light";
}

/** The room's colours, for what cannot take a className: SVG paint, native headers, springs. */
export function usePalette() {
  return palette[useRoom()];
}

/** The room's box shadows: a plate's lift, a track's well, a lit fill's glow. */
export function useShadows() {
  return shadows[useRoom()];
}

export type Palette = ReturnType<typeof usePalette>;

/**
 * A colour at no opacity, for a gradient's far end: `transparent` is clear black, and React
 * Native fades through it, so a glow would turn muddy on its way out.
 */
export function clear(colour: string) {
  return `${colour.slice(0, 7)}00`;
}
