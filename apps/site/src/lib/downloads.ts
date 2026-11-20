import {
  ANALYTICS_SCHEMA_VERSION,
  AnalyticsLocale,
  analyticsPath,
  eventProperties,
  firstTouch,
} from "@lymi/core/analytics";
import { POSTHOG_PROXY_PATH } from "@lymi/core/posthog-proxy";
import { POSTHOG_PROJECT_TOKEN } from "@lymi/core/telemetry";
import { countsAsPageView } from "./deck-page";

/** Lymi on the App Store. Apple opens the visitor's own storefront. */
export const APP_STORE_URL = "https://apps.apple.com/app/id6822912687";

/** Lymi on Google Play. Google opens the listing in the visitor's own language. */
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=app.lymi";

/**
 * Each download link and where it leads. A Mac link names its chip's newest build, which the
 * release job overwrites, so the address never changes.
 */
export const DOWNLOADS = {
  "/download/mac": {
    event: "mac_download_started",
    properties: { chip: "apple_silicon" },
    file: "https://downloads.lymi.app/darwin/arm64/Lymi.dmg",
  },
  "/download/mac-intel": {
    event: "mac_download_started",
    properties: { chip: "intel" },
    file: "https://downloads.lymi.app/darwin/x64/Lymi.dmg",
  },
  "/download/iphone": {
    event: "iphone_download_started",
    properties: {},
    file: APP_STORE_URL,
  },
  "/download/android": {
    event: "android_download_started",
    properties: {},
    file: GOOGLE_PLAY_URL,
  },
} as const;
export type DownloadPath = keyof typeof DOWNLOADS;

export function download(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  return Object.hasOwn(DOWNLOADS, path) ? DOWNLOADS[path as DownloadPath] : undefined;
}

/** The download link with the page's language, which the count reads before the Referer. */
export function downloadHref(path: DownloadPath, locale: string): string {
  return locale === "en" ? path : `${path}?locale=${locale}`;
}

/** The address of the page on this site the visitor came from, if any. */
function sitePath(url: URL, referrer: string | null): string | undefined {
  if (!referrer) return;
  try {
    const from = new URL(referrer);
    return from.origin === url.origin ? from.pathname : undefined;
  } catch {
    return;
  }
}

/** A person following the link, not a link preview, a crawler or a prefetch. */
export function countsAsDownload(request: Request): boolean {
  return new URL(request.url).hostname === "lymi.app" && countsAsPageView(request);
}

/**
 * The cookieless capture the Worker sends for a download: the same shape the site's own pages
 * send, so PostHog counts the visitor with the same daily hash as their page views.
 */
export function downloadCapture(
  request: Request,
  edge: { timezone?: unknown },
): string | undefined {
  const url = new URL(request.url);
  const link = download(url.pathname);
  if (!link) return;
  const referrer = request.headers.get("referer");
  const path = sitePath(url, referrer);
  const from = path && analyticsPath(path, "public");
  const touch = firstTouch(url.toString(), referrer ?? "", "public");
  const properties = eventProperties(link.event, { ...touch, ...link.properties, from }, "worker");
  if (!properties) return;
  const locale =
    AnalyticsLocale.safeParse(url.searchParams.get("locale")).data ??
    AnalyticsLocale.safeParse(path?.match(/^\/(uk|ru)(?=\/|$)/)?.[1]).data ??
    "en";
  return JSON.stringify({
    api_key: POSTHOG_PROJECT_TOKEN,
    event: link.event,
    distinct_id: "$posthog_cookieless",
    properties: {
      ...properties,
      ui_locale: locale,
      surface: "public",
      schema_version: ANALYTICS_SCHEMA_VERSION,
      $cookieless_mode: true,
      $process_person_profile: false,
      $current_url: `${url.origin}${url.pathname}`,
      $host: url.host,
      $pathname: url.pathname,
      $raw_user_agent: request.headers.get("user-agent") ?? "",
      ...(typeof edge.timezone === "string" ? { $timezone: edge.timezone } : {}),
    },
  });
}

/** The capture as a request to the site's own PostHog proxy, which adds the country and address. */
export function downloadCaptureRequest(request: Request, body: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  const agent = request.headers.get("user-agent");
  if (agent) headers.set("user-agent", agent);
  return new Request(new URL(`${POSTHOG_PROXY_PATH}/i/v0/e/`, request.url), {
    method: "POST",
    headers,
    body,
  });
}
