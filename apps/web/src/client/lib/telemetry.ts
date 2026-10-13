import {
  captureAnalytics,
  capturePageview,
  initAnalytics,
  reportBrowserException,
  setAnalyticsLearner,
  setAnalyticsOpening,
  visitFirstTouch,
} from "@lymi/client/analytics";
import { FIRST_TOUCH_HEADER } from "@lymi/core/analytics";
import { isStaleChunkError, reloadOntoCurrentBuild } from "./stale-build";

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
    release: import.meta.env.LYMI_RELEASE || undefined,
  });
  // Vite still rethrows the failed import, which the router or the handlers below then see.
  window.addEventListener("vite:preloadError", () => reloadOntoCurrentBuild());
  window.addEventListener("error", (event) => {
    if (event.error) reportClientException(event.error);
  });
  window.addEventListener("unhandledrejection", (event) => reportClientException(event.reason));
}
export const setTelemetryLearner = setAnalyticsLearner;
export const setTelemetryOpening = setAnalyticsOpening;

/** A chunk an older build named is recovered by a reload, so only a second failure is reported. */
export function reportClientException(error: unknown): void {
  if (isStaleChunkError(error) && reloadOntoCurrentBuild()) return;
  reportBrowserException(error);
}
