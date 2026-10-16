import { type RefObject, useEffect, useRef } from "react";
import { Platform, type TextInput } from "react-native";

/** Long enough for Android's sheet to rise and take window focus. */
const RISE_MS = 350;

/** Props for a field that takes focus as its sheet opens, focused once Android's sheet window is up since `autoFocus` raises no keyboard there. */
export function useSheetFocus({
  on = true,
  open = true,
  ref,
}: {
  on?: boolean | undefined;
  open?: boolean;
  ref?: RefObject<TextInput | null> | undefined;
} = {}) {
  const own = useRef<TextInput>(null);
  const field = ref ?? own;
  const android = Platform.OS === "android";
  // biome-ignore lint/correctness/useExhaustiveDependencies: the field is the same one throughout.
  useEffect(() => {
    if (!android || !on || !open) return;
    const later = setTimeout(() => field.current?.focus(), RISE_MS);
    return () => clearTimeout(later);
  }, [on, open]);
  return { ref: field, autoFocus: on && !android };
}
