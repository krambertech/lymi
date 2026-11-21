// oxlint-disable-next-line eslint/no-restricted-imports -- this is the one place iOS's alert is called.
import { Alert } from "react-native";
import type { AlertButton } from "./alert-buttons";

export type { AlertButton } from "./alert-buttons";

/** A question before what cannot be undone, or a notice, in the system's alert: iOS's own here, Material's dialog on Android. phone.md "After an action". */
export function alert(title: string, message?: string, buttons?: AlertButton[]) {
  Alert.alert(title, message, buttons);
}

/** iOS presents its alert itself; Android's dialog draws from here. */
export function AlertHost() {
  return null;
}
