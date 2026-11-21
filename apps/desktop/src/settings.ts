import type { ThemeChoice } from "@lymi/client/desktop";

export interface Preferences {
  shortcut: string;
  showInMenuBar: boolean;
  showDue: boolean;
  fillSelection: boolean;
  theme: ThemeChoice;
}

export const DEFAULT_SHORTCUT = "Control+Alt+L";
export const DEFAULTS: Preferences = {
  shortcut: DEFAULT_SHORTCUT,
  showInMenuBar: true,
  showDue: false,
  fillSelection: true,
  theme: "system",
};

export const isTheme = (value: unknown): value is ThemeChoice =>
  value === "light" || value === "dark" || value === "system";

export function usableShortcut(accelerator: string) {
  const parts = accelerator.split("+");
  const key = parts.at(-1) ?? "";
  const modifiers = parts.slice(0, -1);
  return (
    (modifiers.includes("Command") || modifiers.includes("Control")) &&
    modifiers.every((m) => ["Command", "Control", "Alt", "Shift"].includes(m)) &&
    new Set(modifiers).size === modifiers.length &&
    /^([A-Z0-9]|Space|F([1-9]|1[0-2]))$/.test(key)
  );
}

export function parsePreferences(saved: unknown): Preferences {
  const value = (typeof saved === "object" && saved !== null ? saved : {}) as Record<
    string,
    unknown
  >;
  const flag = (key: "showInMenuBar" | "showDue" | "fillSelection") =>
    typeof value[key] === "boolean" ? (value[key] as boolean) : DEFAULTS[key];
  return {
    shortcut:
      typeof value.shortcut === "string" && usableShortcut(value.shortcut)
        ? value.shortcut
        : DEFAULTS.shortcut,
    showInMenuBar: flag("showInMenuBar"),
    showDue: flag("showDue"),
    fillSelection: flag("fillSelection"),
    theme: isTheme(value.theme) ? value.theme : DEFAULTS.theme,
  };
}
