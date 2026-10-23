import type { DesktopBridge } from "@lymi/client/desktop";

export type { DesktopBridge, MacPreferences, MacSaved, MacSetting } from "@lymi/client/desktop";

declare global {
  interface Window {
    lymiDesktop?: DesktopBridge;
  }
}

export const desktop = (): DesktopBridge | undefined => window.lymiDesktop;

/** Pages the Mac app draws in its own windows, without the rail or the sign-in redirect. */
export const isDesktopSurface = (pathname: string) => pathname.startsWith("/desktop/");

const MODIFIERS = [
  ["Control", "⌃"],
  ["Alt", "⌥"],
  ["Shift", "⇧"],
  ["Command", "⌘"],
] as const;

/** A shortcut as the Mac writes it, modifiers in the Mac's order: `Control+Alt+L` is ⌃⌥L. */
export function shortcutLabel(accelerator: string): string {
  const parts = accelerator.split("+");
  const key = parts.at(-1) ?? "";
  const mods = MODIFIERS.filter(([name]) => parts.includes(name)).map(([, symbol]) => symbol);
  return `${mods.join("")}${key === "Space" ? "Space" : key}`;
}

/**
 * The accelerator a key press makes, or null until it holds ⌘ or ⌃ and a letter, digit, Space
 * or F-key. By the key's place, so a Ukrainian layout records the same shortcut as an English one.
 */
export function acceleratorFrom(e: KeyboardEvent | React.KeyboardEvent): string | null {
  // ⌥ alone types accents on a Mac, so a global shortcut needs ⌘ or ⌃; the app checks the same.
  if (!(e.metaKey || e.ctrlKey)) return null;
  const key =
    /^Key([A-Z])$/.exec(e.code)?.[1] ??
    /^Digit(\d)$/.exec(e.code)?.[1] ??
    (e.code === "Space" ? "Space" : /^F([1-9]|1[0-2])$/.test(e.code) ? e.code : null);
  if (!key) return null;
  const held = { Control: e.ctrlKey, Alt: e.altKey, Shift: e.shiftKey, Command: e.metaKey };
  return [...MODIFIERS.filter(([name]) => held[name]).map(([name]) => name), key].join("+");
}
