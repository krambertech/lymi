import { AppState } from "react-native";

/** How long the screen's window can take to get focus back before `run` goes anyway. */
const FOCUS_BACK_MS = 500;

/**
 * Runs `run` once the screen's window has focus back from a popup or dialog of Android's own, such
 * as a Material menu or sheet: a screen opened before then misses its insets and a field it focuses
 * gets no keyboard. Returns a cancel.
 */
export function afterWindowFocus(run: () => void) {
  const done = () => {
    focus.remove();
    clearTimeout(late);
    run();
  };
  const focus = AppState.addEventListener("focus", done);
  const late = setTimeout(done, FOCUS_BACK_MS);
  return () => {
    focus.remove();
    clearTimeout(late);
  };
}
