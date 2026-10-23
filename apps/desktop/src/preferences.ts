import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

/** What the learner sets for this Mac. They live on the Mac, not the account, so each Mac keeps its own. */
export interface Preferences {
  shortcut: string;
  showDue: boolean;
  fillSelection: boolean;
}

const DEFAULTS: Preferences = { shortcut: "Control+Alt+L", showDue: true, fillSelection: true };
const file = () => join(app.getPath("userData"), "preferences.json");

export function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(readFileSync(file(), "utf8")) as Partial<Preferences>;
    return {
      shortcut: typeof saved.shortcut === "string" ? saved.shortcut : DEFAULTS.shortcut,
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
