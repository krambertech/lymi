import { expect, it } from "vitest";
import type { DesktopBridge, MacPreferences } from "./desktop";

const firstPreferences = {
  shortcut: "Control+Alt+L",
  showDue: true,
  fillSelection: true,
  openAtLogin: false,
  accessibility: false,
  version: "1.0.0",
} satisfies MacPreferences;

const firstApp = {
  version: 1,
  hidePanel() {},
  resizePanel(_height: number) {},
  setPanelBackground(_color: string) {},
  added() {},
  openApp(_path: string) {},
  onPanelShown: () => () => {},
  preferences: async () => firstPreferences,
  setPreference: async () => ({ ok: true as const, preferences: firstPreferences }),
  allowAccessibility() {},
  setRecordingShortcut(_on: boolean) {},
  onNavigate: () => () => {},
  onMenuCommand: () => () => {},
} satisfies DesktopBridge;

const addedLater = {
  signIn(_provider: "apple" | "google") {},
  restartToUpdate() {},
  onUpdate: () => () => {},
  setTheme(_theme: "light" | "dark" | "system") {},
} satisfies Partial<DesktopBridge>;

it("lets a page meet any released Mac app, which has every method of its version and no newer one", () => {
  const released: DesktopBridge[] = [firstApp, { ...firstApp, version: 4, ...addedLater }];
  expect(released.map((app) => app.setTheme !== undefined)).toEqual([false, true]);
});
