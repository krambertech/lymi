import { msg, plural } from "@lingui/core/macro";
import * as Notifications from "expo-notifications";
import { DEVICE_KEYS, deviceStore } from "../data/kept";
import { i18n } from "../i18n";
import { lineFor, type PlannedReminder } from "./plan";

// The daily reminder as local notifications, which need no push service. phone.md "Outside the app".

const CATEGORY = "review-reminder";
const REVIEW_NOW = "review-now";
const LATER = "in-an-hour";
const HOUR_MS = 60 * 60 * 1000;

const LINES = [
  msg`Review whenever you have a moment.`,
  msg`They’re ready when you are.`,
  msg`A few minutes keeps them fresh.`,
] as const;

function content(due: number, at: Date): Notifications.NotificationContentInput {
  return {
    title: plural(due, { one: "# card to review", other: "# cards to review" }),
    body: i18n._(LINES[lineFor(at, LINES.length)] ?? LINES[0]),
    categoryIdentifier: CATEGORY,
    // Ordinary, so Focus and the scheduled summary can hold it. Never time-sensitive.
    interruptionLevel: "active",
    sound: "default",
  };
}

// In the app the learner already sees what is due, so a reminder that fires then stays silent.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Touch and hold offers Review now and In an hour. The category is registered in each language. */
export async function registerActions() {
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    {
      identifier: REVIEW_NOW,
      buttonTitle: i18n._(msg`Review now`),
      options: { opensAppToForeground: true },
    },
    {
      identifier: LATER,
      buttonTitle: i18n._(msg`In an hour`),
      options: { opensAppToForeground: false },
    },
  ]);
}

export type Permission = "granted" | "denied" | "undetermined";

const permissionOf = (s: Notifications.NotificationPermissionsStatus): Permission =>
  s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ? "granted"
    : s.canAskAgain
      ? "undetermined"
      : "denied";

export async function notificationPermission(): Promise<Permission> {
  return permissionOf(await Notifications.getPermissionsAsync());
}

/** Asks iOS once, when the learner turns the reminder on; afterwards only Settings can change it. */
export async function askPermission(): Promise<Permission> {
  const current = await notificationPermission();
  if (current !== "undetermined") return current;
  return permissionOf(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
}

/** Replaces every scheduled reminder with the plan. */
export async function schedule(plan: readonly PlannedReminder[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const { at, due } of plan) {
    await Notifications.scheduleNotificationAsync({
      content: content(due, at),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

/** Sign-out: nothing scheduled or still on the Lock Screen speaks for the learner who left. */
export async function cancelReminders() {
  deviceStore.remove(DEVICE_KEYS.snoozed);
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}

export function snoozedUntil(): Date | undefined {
  const at = deviceStore.getNumber(DEVICE_KEYS.snoozed);
  return at ? new Date(at) : undefined;
}

const isReminder = (r: Notifications.NotificationResponse) =>
  r.notification.request.content.categoryIdentifier === CATEGORY;

/** Every answer but In an hour opens a review. */
export const opensReview = (r: Notifications.NotificationResponse) =>
  isReminder(r) && r.actionIdentifier !== LATER;

/**
 * In an hour runs without opening the app, so it is answered from the moment the bundle loads,
 * before any screen: the same reminder again an hour on, kept so the next plan does not move it.
 */
export function listenForLater() {
  const putOff = (r: Notifications.NotificationResponse) => {
    if (!isReminder(r) || r.actionIdentifier !== LATER) return;
    Notifications.clearLastNotificationResponse();
    const at = new Date(Date.now() + HOUR_MS);
    deviceStore.set(DEVICE_KEYS.snoozed, at.getTime());
    const { title, body } = r.notification.request.content;
    void Notifications.scheduleNotificationAsync({
      content: { ...content(0, at), title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) putOff(last);
  Notifications.addNotificationResponseReceivedListener(putOff);
}
