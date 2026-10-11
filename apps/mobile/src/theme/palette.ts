import { palette, shadows } from "@lymi/design";
import { useColorScheme } from "react-native";

/** The room's colours, for what cannot take a className: SVG paint, native headers, springs. */
export function usePalette() {
  return palette[useColorScheme() === "dark" ? "dark" : "light"];
}

/** The room's box shadows: a plate's lift, a track's well, a lit fill's glow. */
export function useShadows() {
  return shadows[useColorScheme() === "dark" ? "dark" : "light"];
}

export type Palette = ReturnType<typeof usePalette>;
