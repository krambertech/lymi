/** What the learner sets for this Mac. They live on the Mac, not the account, so each Mac keeps its own. */
export interface Preferences {
  shortcut: string;
  /** The lantern in the menu bar; without it Lymi keeps its Dock icon, so it can always be reached. */
  showInMenuBar: boolean;
  /** The cards due beside the lantern. Off until the learner asks for it. */
  showDue: boolean;
  fillSelection: boolean;
}

export const DEFAULT_SHORTCUT = "Control+Alt+L";
export const DEFAULTS: Preferences = {
  shortcut: DEFAULT_SHORTCUT,
  showInMenuBar: true,
  showDue: false,
  fillSelection: true,
};

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
    new Set(modifiers).size === modifiers.length &&
    /^([A-Z0-9]|Space|F([1-9]|1[0-2]))$/.test(key)
  );
}

/** What a saved file holds, read field by field, so a damaged or older file still starts the app. */
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
  };
}
