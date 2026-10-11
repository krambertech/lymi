import { useColorScheme } from "react-native";
import { palette } from "./tokens.gen";

/** The room's colours, for what cannot take a className: SVG paint, native headers, springs. */
export function usePalette() {
  return palette[useColorScheme() === "dark" ? "dark" : "light"];
}

export type Palette = ReturnType<typeof usePalette>;
