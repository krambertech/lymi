import { I18nManager, Platform } from "react-native";

/** How far in from the start edge iOS's own back swipe begins, and so Lymi's swipes that mirror it. */
const EDGE = 28;

/**
 * Where a swipe that mirrors iOS's back swipe may start, as a gesture's hit slop: the start edge on
 * iOS, and anywhere on the view on Android, whose system takes both edges for its Back gesture.
 */
export function edgeSwipeSlop() {
  if (Platform.OS === "android") return undefined;
  return I18nManager.isRTL ? { right: 0, width: EDGE } : { left: 0, width: EDGE };
}
