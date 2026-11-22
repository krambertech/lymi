let keyboard = false;

if (typeof window !== "undefined") {
  const options = { capture: true, passive: true } as const;
  // oxlint-disable-next-line lymi/shortcut-owner -- records that the last press was a key, and takes none
  window.addEventListener("keydown", () => (keyboard = true), options);
  window.addEventListener("pointerdown", () => (keyboard = false), options);
}

/**
 * Whether the learner's last press was a key, for a change that lands after a round trip rather
 * than with the press, such as Undo in a toast. The keyboard never animates, motion.md.
 */
export const lastInputWasKey = () => keyboard;
