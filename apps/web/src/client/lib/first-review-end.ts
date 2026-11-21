import type { AnalyticsProperties } from "@lymi/core/analytics";
import type { Reminder } from "../components/first-plan";
import { FIRST_REVIEW_END_LEFT_KEY } from "./storage-keys";
import { captureAnalytics } from "./telemetry";

type EndLeft = AnalyticsProperties<"first_review_end_left">;

/** Maps this device's reminder state onto the existing enum, plus why it isn't `on`. */
export function reminderProperties(
  reminder: Reminder,
): Pick<EndLeft, "reminder" | "reminder_reason"> {
  switch (reminder) {
    case "on":
      return { reminder: "on" };
    case "install":
      return { reminder: "unavailable", reminder_reason: "install_required" };
    case "unsupported":
      return { reminder: "unavailable", reminder_reason: "push_unsupported" };
    case "setup_failed":
      return { reminder: "unavailable", reminder_reason: "setup_failed" };
    case "denied":
      return { reminder: "blocked", reminder_reason: "denied" };
    case "loading":
      return { reminder: "off", reminder_reason: "loading" };
    case "error":
      return { reminder: "off", reminder_reason: "error" };
    case "off":
    case "dismissed":
      return { reminder: "off", reminder_reason: "off" };
  }
}

/** Whether this tab's first review already ended, so a remount opens an ordinary review. */
export function firstReviewEndSent(): boolean {
  try {
    return sessionStorage.getItem(FIRST_REVIEW_END_LEFT_KEY) !== null;
  } catch {
    return false;
  }
}

/** Sends `first_review_end_left` once for this tab's first review, even after a remount. */
export function reportFirstReviewEndLeft(properties: EndLeft) {
  if (firstReviewEndSent()) return;
  try {
    sessionStorage.setItem(FIRST_REVIEW_END_LEFT_KEY, "1");
  } catch {}
  captureAnalytics("first_review_end_left", properties);
}
