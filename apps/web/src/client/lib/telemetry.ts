import {
  captureAnalytics,
  capturePageview,
  initAnalytics,
  reportBrowserException,
  setAnalyticsLearner,
  setAnalyticsOpening,
  visitFirstTouch,
} from "@lymi/client/analytics";
import { FIRST_TOUCH_HEADER, REMINDER_ENTRY } from "@lymi/core/analytics";

export { captureAnalytics, capturePageview };

/** Where this visit began, sent with sign-up so the new account records its source. */
export function firstTouchHeaders(): Record<string, string> {
  const touch = visitFirstTouch("product");
  return touch ? { [FIRST_TOUCH_HEADER]: JSON.stringify(touch) } : {};
}

export function firstTouchData(): { firstTouch?: unknown } {
  const touch = visitFirstTouch("product");
  return touch ? { firstTouch: touch } : {};
}

export function initTelemetry(): void {
  initAnalytics({
    token: document.querySelector<HTMLMetaElement>('meta[name="lymi-posthog-token"]')?.content,
    surface: "product",
    enabled:
      !import.meta.env.DEV &&
      !import.meta.env.LYMI_APP_PREVIEW &&
      location.origin === "https://my.lymi.app",
  });
  window.addEventListener("error", (event) => {
    if (event.error) reportClientException(event.error);
  });
  window.addEventListener("unhandledrejection", (event) => reportClientException(event.reason));
  dropReminderEntry();
}

/** Analytics read the reminder's mark at load; a reload of the same address is not another reminder. */
function dropReminderEntry(): void {
  const url = new URL(location.href);
  if (url.searchParams.get(REMINDER_ENTRY.key) !== REMINDER_ENTRY.value) return;
  url.searchParams.delete(REMINDER_ENTRY.key);
  history.replaceState(history.state, "", url);
}
export const setTelemetryLearner = setAnalyticsLearner;
export const setTelemetryOpening = setAnalyticsOpening;
export const reportClientException = reportBrowserException;
