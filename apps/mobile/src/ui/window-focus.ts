import { AppState } from "react-native";

/** How long the screen's window can take to get focus back before `run` goes anyway. */
const FOCUS_BACK_MS = 500;

/** Runs `run` once the screen's window has focus back from an Android popup, so a screen it opens gets its insets and keyboard; returns a cancel. */
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
