import { useState, useSyncExternalStore } from "react";

/**
 * The one rule for which shape an overlay takes. Pointer as well as width, so a tablet held in two
 * hands gets drawers at 900 px. ADR 0017.
 */
export const DESKTOP_QUERY = "(min-width: 768px) and (hover: hover) and (pointer: fine)";

const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  // Viewport emulation can resize the window without a `change` on the query.
  window.addEventListener("resize", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

/** True on a wide screen with a fine pointer, where overlays anchor or centre instead of rising. */
export function useDesktop(): boolean {
  return useSyncExternalStore(subscribe, isDesktop, () => false);
}

const MOUSE_QUERY = "(hover: hover) and (pointer: fine)";
const WIDE_QUERY = "(min-width: 768px)";

function media(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  };
}
const subscribeMouse = media(MOUSE_QUERY);
const subscribeWide = media(WIDE_QUERY);

/** True with a mouse or trackpad, whatever the width: hover works and a click lands where aimed. */
export function useMouse(): boolean {
  return useSyncExternalStore(
    subscribeMouse,
    () => window.matchMedia(MOUSE_QUERY).matches,
    () => false,
  );
}

/** True at the width where the review card has room beside it. */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

/**
 * The device shape, read afresh as the overlay opens and held until it closes: crossing the
 * breakpoint mid-edit would swap shapes, remount the content, and take the half-typed word with it.
 */
export function useOverlayShape(open: boolean): "desktop" | "touch" {
  const desktop = useDesktop();
  const [held, setHeld] = useState<boolean | null>(null);
  if (open && held === null) setHeld(isDesktop());
  if (!open && held !== null) setHeld(null);
  return (open ? (held ?? isDesktop()) : desktop) ? "desktop" : "touch";
}

/** A shortcut as the keyboard in front of the learner labels it; the bindings accept both keys. */
export function modShortcut(key: string): string {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? `⌘${key}` : `Ctrl ${key}`;
}
