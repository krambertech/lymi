import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

/** What the learner sets for this Mac. They live on the Mac, not the account, so each Mac keeps its own. */
export interface Preferences {
  shortcut: string;
  showDue: boolean;
  fillSelection: boolean;
}

export const DEFAULT_SHORTCUT = "Control+Alt+L";
const DEFAULTS: Preferences = { shortcut: DEFAULT_SHORTCUT, showDue: true, fillSelection: true };

/**
 * A global shortcut must hold ⌘ or ⌃ and one key. ⌥ alone is how a Mac types accents, so ⌥E as a
 * global shortcut would break typing in every app. The page records with the same rule.
 */
export function usableShortcut(accelerator: string) {
  const parts = accelerator.split("+");
  const key = parts.at(-1) ?? "";
  const modifiers = parts.slice(0, -1);
  return (
    (modifiers.includes("Command") || modifiers.includes("Control")) &&
    modifiers.every((m) => ["Command", "Control", "Alt", "Shift"].includes(m)) &&
    /^([A-Z0-9]|Space|F([1-9]|1[0-2]))$/.test(key)
  );
}
const file = () => join(app.getPath("userData"), "preferences.json");

export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(readFileSync(file(), "utf8")) as Partial<Preferences>;
    return {
      shortcut:
        typeof saved.shortcut === "string" && usableShortcut(saved.shortcut)
          ? saved.shortcut
          : DEFAULTS.shortcut,
      showDue: typeof saved.showDue === "boolean" ? saved.showDue : DEFAULTS.showDue,
      fillSelection:
        typeof saved.fillSelection === "boolean" ? saved.fillSelection : DEFAULTS.fillSelection,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writePreferences(preferences: Preferences) {
  writeFileSync(file(), JSON.stringify(preferences, null, 2));
}
