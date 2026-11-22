// oxlint-disable-next-line eslint/no-restricted-imports -- this is the one place iOS's alert is called.
import { Alert } from "react-native";
import type { AlertButton } from "./alert-buttons";

export type { AlertButton } from "./alert-buttons";

export function alert(title: string, message?: string, buttons?: AlertButton[]) {
  Alert.alert(title, message, buttons);
}

export function AlertHost() {
  return null;
}
