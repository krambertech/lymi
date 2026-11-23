import { I18nManager, Platform } from "react-native";

const EDGE = 28;

export function edgeSwipeSlop() {
  if (Platform.OS === "android") return undefined;
  return I18nManager.isRTL ? { right: 0, width: EDGE } : { left: 0, width: EDGE };
}
