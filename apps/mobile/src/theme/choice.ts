import { Uniwind } from "uniwind";
import { DEVICE_KEYS, deviceStore } from "../data/kept";

export type ThemeChoice = "system" | "light" | "dark";

const CHOICES: readonly string[] = ["system", "light", "dark"] satisfies ThemeChoice[];

/** The room chosen on this phone, or the system's. */
export function savedTheme(): ThemeChoice {
  const kept = deviceStore.getString(DEVICE_KEYS.theme);
  return kept && CHOICES.includes(kept) ? (kept as ThemeChoice) : "system";
}

export function chooseTheme(choice: ThemeChoice) {
  deviceStore.set(DEVICE_KEYS.theme, choice);
  Uniwind.setTheme(choice);
}

// Applied as the app loads, so a chosen room is there from the first frame.
Uniwind.setTheme(savedTheme());
