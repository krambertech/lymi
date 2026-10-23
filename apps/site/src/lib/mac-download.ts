import {
  ANALYTICS_SCHEMA_VERSION,
  AnalyticsLocale,
  analyticsPath,
  eventProperties,
  firstTouch,
} from "@lymi/core/analytics";
import { POSTHOG_PROXY_PATH } from "@lymi/core/posthog-proxy";
import { POSTHOG_PROJECT_TOKEN } from "@lymi/core/telemetry";

/** Each chip's newest build; the release job overwrites the file, so the address never changes. */
export const MAC_DOWNLOADS = {
  "/download/mac": {
    chip: "apple_silicon",
    file: "https://downloads.lymi.app/darwin/arm64/Lymi.dmg",
  },
  "/download/mac-intel": {
    chip: "intel",
    file: "https://downloads.lymi.app/darwin/x64/Lymi.dmg",
  },
} as const;
export type MacDownloadPath = keyof typeof MAC_DOWNLOADS;

export function macDownload(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  return Object.hasOwn(MAC_DOWNLOADS, path) ? MAC_DOWNLOADS[path as MacDownloadPath] : undefined;
}

/** The page on this site the visitor came from, if any. */
function sitePage(url: URL, referrer: string | null): string | undefined {
  if (!referrer) return;
  try {
    const from = new URL(referrer);
    return from.origin === url.origin ? analyticsPath(from.pathname, "public") : undefined;
  } catch {
    return;
  }
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
  const download = macDownload(url.pathname);
  if (!download) return;
  const referrer = request.headers.get("referer");
  const from = sitePage(url, referrer);
  const touch = firstTouch(url.toString(), referrer ?? "", "public");
  const properties = eventProperties(
    "mac_download_started",
    { ...touch, chip: download.chip, from },
    "worker",
  );
  if (!properties) return;
  const locale = from?.match(/^\/(uk|ru)(?=\/|$)/)?.[1] ?? "en";
  return JSON.stringify({
    api_key: POSTHOG_PROJECT_TOKEN,
    event: "mac_download_started",
    distinct_id: "$posthog_cookieless",
    properties: {
      ...properties,
      ui_locale: AnalyticsLocale.parse(locale),
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
