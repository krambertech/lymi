import {
  type CaughtBy,
  captureAnalytics,
  capturePageview,
  initAnalytics,
  reportBrowserException,
  setAnalyticsLearner,
  setAnalyticsOpening,
  visitFirstTouch,
} from "@lymi/client/analytics";
import { carryFirstTouch, FIRST_TOUCH_HEADER } from "@lymi/core/analytics";
import { isStaleChunkError, reloadOntoCurrentBuild } from "./stale-build";

export { captureAnalytics, capturePageview };

/** Session replay masks the text inside an element with this class; every card's own words carry it. */
export const PRIVATE_TEXT = "ph-mask";
/** Session replay draws an element with this class as an empty box; a card's picture carries it. */
export const PRIVATE_BOX = "ph-no-capture";

/** Where this visit began, sent with sign-up so the new account records its source. */
export function firstTouchHeaders(): Record<string, string> {
  const touch = visitFirstTouch("product");
  return touch ? { [FIRST_TOUCH_HEADER]: JSON.stringify(touch) } : {};
}

export function firstTouchData(): { firstTouch?: unknown } {
  const touch = visitFirstTouch("product");
  return touch ? { firstTouch: touch } : {};
}

/** A product address that keeps where this visit began across a full page load. */
export function withFirstTouch(path: string): string {
  const touch = visitFirstTouch("product");
  if (!touch) return path;
  const url = carryFirstTouch(new URL(path, location.origin), touch);
  return url.pathname + url.search;
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
    if (event.error) reportClientException(event.error, "window");
  });
  window.addEventListener("unhandledrejection", (event) =>
    reportClientException(event.reason, "rejection"),
  );
}
export const setTelemetryLearner = setAnalyticsLearner;
export const setTelemetryOpening = setAnalyticsOpening;

// A route error reaches both the router's boundary and React's root, which would report it twice.
const reported = new WeakSet<object>();

/** A chunk an older build named is recovered by a reload, so only a second failure is reported. */
export function reportClientException(error: unknown, caughtBy: CaughtBy): void {
  if (typeof error === "object" && error !== null) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  if (isStaleChunkError(error) && reloadOntoCurrentBuild()) return;
  reportBrowserException(error, caughtBy);
}
