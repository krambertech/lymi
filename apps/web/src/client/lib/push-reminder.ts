import type { PushSubscriptionInput, ReminderTime } from "@lymi/core";
import { api } from "./api";
import { captureAnalytics } from "./telemetry";

// The daily reminder's browser side, shared by Settings and the end of the first review.

export const DEFAULT_TIME: ReminderTime = "19:00";

export function supportsPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function timezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function publicKeyBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function subscriptionInput(
  subscription: PushSubscription,
  reminderTime: ReminderTime,
): PushSubscriptionInput {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("This browser did not return a complete push subscription");
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    reminderTime,
    timezone: timezone(),
  };
}

/**
 * Asks for notifications and saves this device's reminder. Call it inside the press: the browser
 * only shows its prompt during the gesture, so the key must already be loaded.
 */
export async function turnOnReminder(
  publicKey: string,
  time: ReminderTime = DEFAULT_TIME,
): Promise<"on" | "denied" | "dismissed"> {
  const prompted = Notification.permission === "default";
  if (prompted) captureAnalytics("reminder_prompt_shown", {});
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "dismissed";
  if (prompted) captureAnalytics("reminder_prompt_accepted", {});
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKeyBytes(publicKey),
    }));
  await api.savePushSubscription(subscriptionInput(subscription, time));
  return "on";
}
