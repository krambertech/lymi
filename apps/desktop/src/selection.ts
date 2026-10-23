import { execFile } from "node:child_process";
import { ClipboardItem, clipboard, systemPreferences } from "electron";
import { termFromCopy } from "./term.js";

// Presses ⌘C through Core Graphics, which needs only Accessibility; System Events would also need Automation.
const COPY = `ObjC.import("CoreGraphics");
const press = (down) => {
  const event = $.CGEventCreateKeyboardEvent(null, 8, down);
  $.CGEventSetFlags(event, $.kCGEventFlagMaskCommand);
  $.CGEventPost($.kCGHIDEventTap, event);
};
press(true);
press(false);`;

/** Whether macOS lets the app press keys. Never asks: only This Mac's button does, once. */
export function canCopySelection() {
  return process.platform === "darwin" && systemPreferences.isTrustedAccessibilityClient(false);
}

/**
 * The text selected in the app in front, read by pressing ⌘C there. The clipboard is put back as
 * it was, every item in every type it held, so adding a word never costs what the learner copied.
 */
export async function selectedText(): Promise<string | null> {
  // An item's types resolve lazily from the clipboard, so each is read now, before it is cleared.
  const saved = await Promise.all(
    (await clipboard.read()).map(
      async (item) =>
        new ClipboardItem(
          Object.fromEntries(
            await Promise.all(item.types.map(async (type) => [type, await item.getType(type)])),
          ),
        ),
    ),
  );
  clipboard.clear();
  try {
    await new Promise<void>((resolve, reject) =>
      execFile("osascript", ["-l", "JavaScript", "-e", COPY], (error) =>
        error ? reject(error) : resolve(),
      ),
    );
    let text = "";
    for (let tries = 0; tries < 15 && !text; tries++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      text = await clipboard.readText();
    }
    return termFromCopy(text);
  } catch (error) {
    console.error("Couldn’t copy the selection", error);
    return null;
  } finally {
    clipboard.clear();
    if (saved.length) await clipboard.write(saved);
  }
}
