import { describe, expect, it } from "vitest";
import { DEFAULTS, parsePreferences, usableShortcut } from "./settings.js";

describe("the quick-add shortcut", () => {
  it("takes ⌘ or ⌃ with one key", () => {
    expect(usableShortcut("Control+Alt+L")).toBe(true);
    expect(usableShortcut("Shift+Command+2")).toBe(true);
    expect(usableShortcut("Control+Space")).toBe(true);
    expect(usableShortcut("Command+F12")).toBe(true);
  });

  it("refuses ⌥ or ⇧ alone, a bare key, an unknown key or a repeated modifier", () => {
    expect(usableShortcut("Alt+E")).toBe(false);
    expect(usableShortcut("Shift+Alt+E")).toBe(false);
    expect(usableShortcut("L")).toBe(false);
    expect(usableShortcut("Command+Comma")).toBe(false);
    expect(usableShortcut("Control+Control+L")).toBe(false);
    expect(usableShortcut("Hyper+L")).toBe(false);
  });
});

describe("reading saved preferences", () => {
  it("starts with the lantern shown and the count hidden", () => {
    expect(parsePreferences(null)).toEqual(DEFAULTS);
    expect(DEFAULTS).toMatchObject({ showInMenuBar: true, showDue: false, fillSelection: true });
  });

  it("keeps each valid field and replaces each damaged one", () => {
    expect(
      parsePreferences({ shortcut: "Command+K", showInMenuBar: false, showDue: "yes", extra: 1 }),
    ).toEqual({ ...DEFAULTS, shortcut: "Command+K", showInMenuBar: false });
  });

  it("drops a shortcut that would break typing, from an older or edited file", () => {
    expect(parsePreferences({ shortcut: "Alt+E" }).shortcut).toBe(DEFAULTS.shortcut);
  });
});
