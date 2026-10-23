import { describe, expect, it } from "vitest";
import { acceleratorFrom, shortcutLabel } from "./desktop";

const press = (
  code: string,
  held: Partial<Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>>,
) =>
  ({
    code,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...held,
  }) as KeyboardEvent;

describe("recording the quick-add shortcut", () => {
  it("records ⌘ or ⌃ with a key, in the Mac's modifier order", () => {
    expect(acceleratorFrom(press("KeyL", { ctrlKey: true, altKey: true }))).toBe("Control+Alt+L");
    expect(acceleratorFrom(press("Digit2", { metaKey: true, shiftKey: true }))).toBe(
      "Shift+Command+2",
    );
    expect(acceleratorFrom(press("Space", { ctrlKey: true }))).toBe("Control+Space");
    expect(acceleratorFrom(press("F5", { metaKey: true }))).toBe("Command+F5");
  });

  it("refuses ⌥ alone, which types accents, and a modifier with no key", () => {
    expect(acceleratorFrom(press("KeyE", { altKey: true }))).toBeNull();
    expect(acceleratorFrom(press("KeyE", { altKey: true, shiftKey: true }))).toBeNull();
    expect(acceleratorFrom(press("ControlLeft", { ctrlKey: true }))).toBeNull();
    expect(acceleratorFrom(press("Comma", { metaKey: true }))).toBeNull();
  });

  it("goes by the key's place, so another layout records the same shortcut", () => {
    // ⌃⌥ and the key where L is, whatever letter a Ukrainian layout prints on it.
    expect(acceleratorFrom(press("KeyL", { ctrlKey: true, altKey: true }))).toBe("Control+Alt+L");
  });

  it("shows a shortcut in the Mac's symbols", () => {
    expect(shortcutLabel("Control+Alt+L")).toBe("⌃⌥L");
    expect(shortcutLabel("Shift+Command+2")).toBe("⇧⌘2");
    expect(shortcutLabel("Control+Space")).toBe("⌃Space");
  });
});
