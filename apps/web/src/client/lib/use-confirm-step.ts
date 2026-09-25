import { type FocusEvent, useEffect, useRef, useState } from "react";

const LAPSE_MS = 6000;

/**
 * A destructive button that asks once before it acts. The ask lapses after a pause, but never
 * while the pointer or focus is on it, and focus follows the buttons as they swap.
 */
export function useConfirmStep() {
  const [confirming, setConfirming] = useState(false);
  const [held, setHeld] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const safe = useRef<HTMLButtonElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!confirming || held) return;
    const timer = setTimeout(() => setConfirming(false), LAPSE_MS);
    return () => clearTimeout(timer);
  }, [confirming, held]);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (confirming ? safe : trigger).current?.focus();
  }, [confirming]);

  return {
    confirming,
    ask: () => {
      moveFocus.current = document.activeElement === trigger.current;
      setConfirming(true);
    },
    cancel: () => {
      moveFocus.current = !!group.current?.contains(document.activeElement);
      setHeld(false);
      setConfirming(false);
    },
    trigger,
    safe,
    groupProps: {
      ref: group,
      onPointerEnter: () => setHeld(true),
      onPointerLeave: () => setHeld(false),
      onFocus: () => setHeld(true),
      onBlur: (e: FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      },
    },
  };
}
