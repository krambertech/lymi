import { type StyleProp, StyleSheet, type TextStyle } from "react-native";
import { useStore } from "../data/store";

/** iOS resolves "System" to San Francisco, with its optical sizes and tracking. */
const SF = "System";
const ONEST = "Onest";

/** Display type: the title steps and anything set at 20 pt or larger. */
const DISPLAY = /\btext-(xl|[2-7]xl)\b/;

export function isDisplay(className: string | undefined, style: StyleProp<TextStyle>) {
  if (className && DISPLAY.test(className)) return true;
  const size = StyleSheet.flatten(style)?.fontSize;
  return typeof size === "number" && size >= 20;
}

/** The face the current type direction gives this text. */
export function useFontFamily(display: boolean) {
  const { directions } = useStore();
  if (directions.type === "system") return SF;
  if (directions.type === "mixed") return display ? ONEST : SF;
  return ONEST;
}
