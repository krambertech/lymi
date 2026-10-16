import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Every haptic by the moment it marks, iOS's taps and Android's own constants, as phone.md "Haptics" lists them.

const android = Platform.OS === "android";
const quiet = () => undefined;
const play = (effect: Haptics.AndroidHaptics) => () =>
  void Haptics.performAndroidHapticsAsync(effect).catch(quiet);
const impact = (style: Haptics.ImpactFeedbackStyle) => () =>
  void Haptics.impactAsync(style).catch(quiet);
const notify = (type: Haptics.NotificationFeedbackType) => () =>
  void Haptics.notificationAsync(type).catch(quiet);
const selection = () => void Haptics.selectionAsync().catch(quiet);
const { AndroidHaptics: A, ImpactFeedbackStyle: I, NotificationFeedbackType: N } = Haptics;

export const haptics = {
  /** A button or row pressed. */
  press: android ? quiet : selection,
  /** A small step: a choice in a sheet, an undo, a peek, a dragged row passing a slot, pulling past the line. */
  tick: android ? play(A.Segment_Tick) : selection,
  /** A switch turned on or off. */
  toggle: (on: boolean) => (android ? play(on ? A.Toggle_On : A.Toggle_Off)() : selection()),
  /** A card's answer revealed. */
  reveal: android ? play(A.Context_Click) : impact(I.Light),
  /** Any grade, Forgot included: the same small tap. */
  grade: android ? play(A.Context_Click) : impact(I.Soft),
  /** A review starting. */
  start: android ? play(A.Confirm) : impact(I.Medium),
  /** A card added. */
  added: android ? play(A.Confirm) : selection,
  /** The daily goal reached, or a deck made. */
  success: android ? play(A.Confirm) : notify(N.Success),
  /** A press that does nothing yet, and says why. */
  warning: android ? play(A.Reject) : notify(N.Warning),
  /** Something failed, such as signing in. */
  error: android ? play(A.Reject) : notify(N.Error),
  /** A row picked up to drag. */
  pickUp: android ? play(A.Drag_Start) : impact(I.Medium),
  /** A long press opening a row's actions; iOS's context menu plays its own. */
  longPress: android ? play(A.Long_Press) : quiet,
};
