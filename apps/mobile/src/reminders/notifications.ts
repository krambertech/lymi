import { msg } from "@lingui/core/macro";
import { type Reminder, ReminderMessage } from "@lymi/core";
import * as Notifications from "expo-notifications";
import { DEVICE_KEYS, deviceStore } from "../data/kept";
import { i18n } from "../i18n";
import { reminderWords } from "../i18n/reminders";
import { captureEvent } from "../telemetry/posthog";
import type { PlannedReminder } from "./plan";

// The daily reminder as local notifications, which need no push service. phone.md "Outside the app".

const CATEGORY = "review-reminder";
const REVIEW_NOW = "review-now";
const LATER = "in-an-hour";
const HOUR_MS = 60 * 60 * 1000;

function content(reminder: Reminder): Notifications.NotificationContentInput {
  return {
    ...reminderWords(i18n, reminder),
    categoryIdentifier: CATEGORY,
    data: { message: reminder.message },
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
  captureEvent("reminder_prompt_shown", {});
  const answer = permissionOf(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    }),
  );
  if (answer === "granted") captureEvent("reminder_prompt_accepted", {});
  return answer;
}

// Each change waits for the one before it, so a sign-out's cancel can never land between a plan's
// own cancel and its scheduling and leave reminders for the learner who left.
let queue: Promise<unknown> = Promise.resolve();
let latest = 0;
function inTurn<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Replaces every scheduled reminder with the plan, unless a newer plan or a sign-out came after it.
 * Answers whether the plan landed.
 */
export function schedule(plan: readonly PlannedReminder[]) {
  const mine = ++latest;
  return inTurn(async () => {
    if (mine !== latest) return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const { at, message, count } of plan) {
      await Notifications.scheduleNotificationAsync({
        content: content({ message, count }),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
    return true;
  });
}

/** Sign-out: nothing scheduled or still on the Lock Screen speaks for the learner who left. */
export function cancelReminders() {
  latest++;
  deviceStore.remove(DEVICE_KEYS.snoozed);
  deviceStore.remove(DEVICE_KEYS.reminderReported);
  return inTurn(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  });
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

/** Which message was answered. A reminder scheduled by an earlier release names none. */
export const messageOf = (r: Notifications.NotificationResponse) =>
  ReminderMessage.safeParse(r.notification.request.content.data?.message).data;

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
    const { title, body, data } = r.notification.request.content;
    void inTurn(async () => {
      await Notifications.scheduleNotificationAsync({
        content: { ...content({ message: "ready", count: 0 }), title, body, data },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    });
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) putOff(last);
  Notifications.addNotificationResponseReceivedListener(putOff);
}
