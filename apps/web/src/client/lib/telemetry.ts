import {
  captureAnalytics,
  capturePageview,
  initAnalytics,
  reportBrowserException,
  setAnalyticsLearner,
} from "@lymi/client/analytics";

export { captureAnalytics, capturePageview };

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
}
export const setTelemetryLearner = setAnalyticsLearner;
export const reportClientException = reportBrowserException;
