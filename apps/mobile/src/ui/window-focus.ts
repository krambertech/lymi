import { AppState } from "react-native";

const FOCUS_BACK_MS = 500;

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
