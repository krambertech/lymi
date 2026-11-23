import { type RefObject, useEffect, useRef } from "react";
import { Platform, type TextInput } from "react-native";

const RISE_MS = 350;

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
  // oxlint-disable react-hooks/exhaustive-deps -- the field is the same one throughout.
  useEffect(() => {
    if (!android || !on || !open) return;
    const later = setTimeout(() => field.current?.focus(), RISE_MS);
    return () => clearTimeout(later);
  }, [on, open]);
  // oxlint-enable react-hooks/exhaustive-deps
  return { ref: field, autoFocus: on && !android };
}
