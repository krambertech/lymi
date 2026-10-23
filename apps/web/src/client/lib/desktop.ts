/**
 * What the Mac app's preload offers the page; absent in a browser. `apps/desktop/src/preload.cts`.
 * An installed app updates long after the web, so a method is only ever added, never renamed or
 * removed, and one added after version 1 is optional here and called with `?.()`.
 */
export interface DesktopBridge {
  version: number;
  hidePanel(): void;
  resizePanel(height: number): void;
  /** A `#rrggbb` the window fills with, so it matches the page's theme. */
  setPanelBackground(color: string): void;
  added(): void;
  openApp(path: string): void;
  /** `selection` is the text selected in the app in front, when the learner lets Lymi read it. */
  onPanelShown(listener: (shown: { selection: string | null }) => void): () => void;
  preferences(): Promise<MacPreferences>;
  setPreference<K extends MacSetting>(key: K, value: MacPreferences[K]): Promise<MacSaved>;
  /** Asks macOS for Accessibility and opens its page in System Settings. */
  allowAccessibility(): void;
  /** Pauses the quick-add shortcut while This Mac records a new one. */
  setRecordingShortcut(on: boolean): void;
  /** A product path the app asks the page to show, such as after ⌘Enter in quick add. */
  onNavigate(listener: (path: string) => void): () => void;
  /** A command from the Mac's menu bar, such as `today` or `add_card`. */
  onMenuCommand(listener: (command: string) => void): () => void;
}

/** What the learner sets for this Mac, kept on the Mac; `apps/desktop/src/preferences.ts`. */
export interface MacPreferences {
  /** An Electron accelerator, such as `Control+Alt+L`. */
  shortcut: string;
  showDue: boolean;
  fillSelection: boolean;
  openAtLogin: boolean;
  /** Whether macOS lets Lymi read the selection; read only. */
  accessibility: boolean;
  version: string;
}

export type MacSetting = "shortcut" | "showDue" | "fillSelection" | "openAtLogin";
export type MacSaved =
  | { ok: true; preferences: MacPreferences }
  | { ok: false; reason: "taken" | "invalid"; preferences: MacPreferences };

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
