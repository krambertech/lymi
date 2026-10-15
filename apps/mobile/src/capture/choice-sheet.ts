import { CHIPS_LEAVE } from "@lymi/design";
import { useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { timed } from "../theme/motion";
import { CHIPS_RETURN } from "./chip-in";

/** The chips' clock runs straight; each chip eases its own rise. */
const CHIPS_BACK = { duration: CHIPS_RETURN, ease: "linear" } as const;
const SETTLE = { duration: 0.25, ease: "linear" } as const;

/**
 * A card form's choices, each a row sheet over the form. While one is open the form keeps the
 * keyboard's room so the chips hold still and fade; once the sheet has gone, `refocus` brings the
 * keyboard back and the chips rise over it. phone.md "Add a word and Edit card".
 */
export function useChoiceSheet<K extends string>(refocus: () => void) {
  // The open choice, and the one its sheet holds, which stays while the sheet goes.
  const [choice, setChoice] = useState<K | null>(null);
  const [held, setHeld] = useState<K | null>(null);
  const hold = useSharedValue(0);
  const chips = useSharedValue(1);
  const choosing = useRef(false);
  choosing.current = choice !== null;
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      if (!choosing.current) hold.value = withTiming(0, timed(SETTLE));
    });
    return () => shown.remove();
  }, [hold]);

  const open = (kind: K) => {
    // A second tap lands while the keyboard is already leaving, and would drop the held room.
    if (choosing.current) return;
    choosing.current = true;
    hold.value = Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0;
    chips.value = withTiming(0, timed(CHIPS_LEAVE));
    Keyboard.dismiss();
    setHeld(kind);
    setChoice(kind);
  };
  const close = () => setChoice(null);
  const closed = () => {
    chips.value = withTiming(1, timed(CHIPS_BACK));
    refocus();
  };
  return {
    choice,
    held,
    hold,
    chips,
    open,
    close,
    /** What the form's `Sheet` takes, bar its title and content. */
    sheet: {
      open: choice !== null,
      onOpenChange: (open: boolean) => !open && close(),
      onDismiss: closed,
    },
  };
}
