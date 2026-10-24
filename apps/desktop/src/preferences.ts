import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import { type Preferences, parsePreferences } from "./settings.js";

const file = () => join(app.getPath("userData"), "preferences.json");

export function readPreferences(): Preferences {
  try {
    return parsePreferences(JSON.parse(readFileSync(file(), "utf8")));
  } catch {
    return parsePreferences(null);
  }
}

export function writePreferences(preferences: Preferences) {
  writeFileSync(file(), JSON.stringify(preferences, null, 2));
}
