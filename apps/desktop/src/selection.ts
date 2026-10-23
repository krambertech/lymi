import { execFile } from "node:child_process";
import { ClipboardItem, clipboard, systemPreferences } from "electron";

// Presses ⌘C through Core Graphics, which needs only Accessibility; System Events would also need Automation.
const COPY = `ObjC.import("CoreGraphics");
const press = (down) => {
  const event = $.CGEventCreateKeyboardEvent(null, 8, down);
  $.CGEventSetFlags(event, $.kCGEventFlagMaskCommand);
  $.CGEventPost($.kCGHIDEventTap, event);
};
press(true);
press(false);`;
const LONGEST = 120;

let asked = false;

/** Whether macOS lets the app press keys; asks once a run, which opens the system's own prompt. */
export function canCopySelection() {
  if (process.platform !== "darwin") return false;
  const trusted = systemPreferences.isTrustedAccessibilityClient(!asked);
  asked = true;
  return trusted;
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
    const term = text.trim().replace(/\s+/g, " ");
    // A paragraph is not a term; the learner still has the panel to type one.
    return term && term.length <= LONGEST && !text.trim().includes("\n") ? term : null;
  } catch (error) {
    console.error("Couldn’t copy the selection", error);
    return null;
  } finally {
    clipboard.clear();
    if (saved.length) await clipboard.write(saved);
  }
}
