import { useEffect, useEffectEvent } from "react";
import { composing } from "./composing";
import { appleKeyboard } from "./device";

type ShortcutKeys = { key: string | readonly string[] } | { code: string } | { mod: "k" };

interface ShortcutOptions {
  enabled?: boolean | undefined;
  over?: "card-place" | "unfocused" | "any" | undefined;
  focus?: "any" | { apartFrom: string } | undefined;
  repeat?: boolean | undefined;
  phase?: "bubble" | "capture" | undefined;
}

const OVERLAY =
  ':is([role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]):not([data-slot="toast"])';
const CLOSED = '[data-closed], [inert], [hidden], [aria-hidden="true"]';
const FIELD = "input, textarea, select";
const CONTROL = `a, button, summary, ${FIELD}, [contenteditable="true"], [role="radio"], [role="checkbox"], [role="switch"]`;

function matches(e: KeyboardEvent, keys: ShortcutKeys): boolean {
  if ("mod" in keys) {
    if (e.altKey || e.shiftKey) return false;
    if (appleKeyboard() ? !e.metaKey || e.ctrlKey : !e.ctrlKey || e.metaKey) return false;
    return e.code === `Key${keys.mod.toUpperCase()}` || e.key?.toLowerCase() === keys.mod;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if ("code" in keys) return e.code === keys.code;
  return typeof keys.key === "string" ? e.key === keys.key : keys.key.includes(e.key);
}

function underOverlay(over: ShortcutOptions["over"]): boolean {
  if (over === "any") return false;
  if (over === "unfocused") return !!document.activeElement?.closest(OVERLAY);
  return [...document.querySelectorAll(OVERLAY)].some(
    (overlay) => !overlay.closest(CLOSED) && !(over && overlay.matches(`[data-overlay="${over}"]`)),
  );
}

function heldByFocus(e: KeyboardEvent, focus: ShortcutOptions["focus"]): boolean {
  if (focus === "any" || !(e.target instanceof HTMLElement)) return false;
  const control = e.target.closest(CONTROL);
  if (focus) return !!control && !control.matches(focus.apartFrom);
  if (e.target.matches(FIELD) || e.target.isContentEditable) return true;
  return !!control && (e.key === " " || e.key === "Enter");
}

export function useShortcut(
  keys: ShortcutKeys,
  run: (e: KeyboardEvent) => void,
  { enabled = true, over, focus, repeat = false, phase = "bubble" }: ShortcutOptions = {},
): void {
  const claims = useEffectEvent(
    (e: KeyboardEvent) =>
      enabled && matches(e, keys) && !composing(e) && !heldByFocus(e, focus) && !underOverlay(over),
  );
  const answer = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Escape") e.preventDefault();
    if (repeat || !e.repeat) run(e);
  });

  useEffect(() => {
    let claimed: KeyboardEvent | null = null;
    const onCapture = (e: KeyboardEvent) => {
      claimed = claims(e) ? e : null;
      if (claimed && phase === "capture") answer(e);
    };
    const onBubble = (e: KeyboardEvent) => {
      if (claimed === e && phase === "bubble" && !e.defaultPrevented) answer(e);
    };
    window.addEventListener("keydown", onCapture, true);
    window.addEventListener("keydown", onBubble);
    return () => {
      window.removeEventListener("keydown", onCapture, true);
      window.removeEventListener("keydown", onBubble);
    };
  }, [phase]);
}
