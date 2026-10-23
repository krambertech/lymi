import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { DesktopBridge, MacPreferences } from "@lymi/client/desktop";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { ThisMacSection } from "./this-mac-section";

i18n.load("en", messages);
i18n.activate("en");

/** Settings' This Mac against a stand-in for the Mac app, which keeps these settings itself. */
let prefs: MacPreferences;
const app = {
  setPreference: vi.fn(async (key: keyof MacPreferences, value: unknown) => {
    if (key === "shortcut" && value === "Command+Space")
      return { ok: false as const, reason: "taken" as const, preferences: prefs };
    prefs = { ...prefs, [key]: value };
    return { ok: true as const, preferences: prefs };
  }),
  setRecordingShortcut: vi.fn(),
  allowAccessibility: vi.fn(),
};

beforeEach(() => {
  prefs = {
    shortcut: "Control+Alt+L",
    showInMenuBar: true,
    showDue: false,
    fillSelection: true,
    openAtLogin: false,
    accessibility: false,
    version: "0.0.1",
  };
  window.lymiDesktop = {
    version: 1,
    ...app,
    preferences: async () => prefs,
  } as unknown as DesktopBridge;
});

afterEach(() => {
  vi.clearAllMocks();
  delete window.lymiDesktop;
});

const renderSection = () =>
  render(
    <I18nProvider i18n={i18n}>
      <ThisMacSection />
    </I18nProvider>,
  );

test("shows nothing in a browser, where there is no Mac app", async () => {
  delete window.lymiDesktop;
  renderSection();
  await expect.element(page.getByRole("heading", { name: "This Mac" })).not.toBeInTheDocument();
});

test("saves each switch on the Mac, and hiding the lantern turns off its count", async () => {
  renderSection();
  await userEvent.click(page.getByRole("switch", { name: "Due count beside the lantern" }));
  expect(app.setPreference).toHaveBeenCalledWith("showDue", true);

  await userEvent.click(page.getByRole("switch", { name: "Show in the menu bar" }));
  expect(app.setPreference).toHaveBeenCalledWith("showInMenuBar", false);
  await expect
    .element(page.getByRole("switch", { name: "Due count beside the lantern" }))
    .toBeDisabled();
  await expect
    .element(page.getByText("Lymi stays in the Dock instead", { exact: false }))
    .toBeVisible();
});

test("records a new shortcut with the current one paused, and refuses ⌥ alone", async () => {
  renderSection();
  const button = page.getByRole("button", { name: "Quick add shortcut: ⌃⌥L. Change" });
  await userEvent.click(button);
  expect(app.setRecordingShortcut).toHaveBeenCalledWith(true);

  await userEvent.keyboard("{Alt>}e{/Alt}");
  expect(app.setPreference).not.toHaveBeenCalled();
  await userEvent.keyboard("{Control>}{Alt>}k{/Alt}{/Control}");
  expect(app.setPreference).toHaveBeenCalledWith("shortcut", "Control+Alt+K");
  expect(app.setRecordingShortcut).toHaveBeenLastCalledWith(false);
  await expect
    .element(page.getByRole("button", { name: "Quick add shortcut: ⌃⌥K. Change" }))
    .toBeVisible();
});

test("says so when another app already holds the shortcut", async () => {
  renderSection();
  await userEvent.click(page.getByRole("button", { name: "Quick add shortcut: ⌃⌥L. Change" }));
  await userEvent.keyboard("{Meta>} {/Meta}");
  await expect
    .element(page.getByText("Another app already uses that shortcut. Try a different one."))
    .toBeVisible();
});

test("offers System Settings until macOS allows reading the selection", async () => {
  renderSection();
  await userEvent.click(page.getByRole("button", { name: "Open System Settings" }));
  expect(app.allowAccessibility).toHaveBeenCalledOnce();
});
