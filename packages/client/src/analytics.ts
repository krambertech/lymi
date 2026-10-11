import {
  ANALYTICS_SCHEMA_VERSION,
  AnalyticsLocale,
  type AnalyticsName,
  type AnalyticsProperties,
  type Attribution,
  analyticsPath,
  type Backlog,
  eventProperties,
  firstTouch,
  INTERNAL_ACCOUNT_IDS,
  REMINDER_ENTRY,
} from "@lymi/core/analytics";
import { POSTHOG_PROXY_PATH } from "@lymi/core/posthog-proxy";
import { exceptionProperties } from "@lymi/core/telemetry";
import posthog from "posthog-js/no-external";

export const ANALYTICS_READY = "lymi:analytics-ready";
// Read at load, before client-side navigation rewrites the address and the referrer stops applying.
const arrival =
  typeof location === "undefined" ? undefined : { url: location.href, referrer: document.referrer };
let ready = false;
let surface: "public" | "product" = "product";
let initialized = false;
let learner: string | undefined;
let accountAllowed = false;
let accountChecked = false;
let identifySent: string | undefined;
let lastPage: string | undefined;
let openingSent = false;
let opening: AnalyticsProperties<"app_opened"> | undefined;
let publicDeckSent = false;
let pageSource: Omit<Attribution, "first_landing_page"> | undefined;

/** Where this page load's visit began, for the sign-up request to carry to the server. */
export function visitFirstTouch(on: "public" | "product" = surface): Attribution | undefined {
  try {
    return arrival ? firstTouch(arrival.url, arrival.referrer, on) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The public site counts visitors without identifying them. The product measures a signed-in
 * learner unless their account turned analytics off, and a signed-out visitor anonymously.
 */
function allowed(): boolean {
  if (surface === "public") return true;
  return accountChecked && (!learner || accountAllowed);
}

function forget(): void {
  if (initialized) {
    try {
      posthog.reset();
    } catch {
      /* Monitoring is best effort. */
    }
  }
  identifySent = undefined;
  lastPage = undefined;
  openingSent = false;
  opening = undefined;
}

/** How this page load began: a reminder's link, a link from another site, or neither. */
function arrivalEntry(): "reminder" | "link" | "direct" {
  if (!arrival) return "direct";
  try {
    if (new URL(arrival.url).searchParams.get(REMINDER_ENTRY.key) === REMINDER_ENTRY.value)
      return "reminder";
  } catch {
    return "direct";
  }
  return visitFirstTouch("product")?.referrer ? "link" : "direct";
}

function sendOpening(): void {
  if (openingSent || !opening || !learner || identifySent !== learner) return;
  if (captureAnalytics("app_opened", { entry: arrivalEntry(), ...opening })) openingSent = true;
}

/**
 * The product reports what was due when it opened, from the deck list it loads anyway, so the
 * opening waits for that list rather than asking for anything.
 */
export function setAnalyticsOpening(backlog?: Backlog): void {
  opening = backlog ? { backlog } : {};
  sendOpening();
}

export function initAnalytics(options: {
  token?: string | undefined;
  surface: "public" | "product";
  enabled: boolean;
}): void {
  if (initialized || !options.enabled || !/^phc_[A-Za-z0-9]+$/.test(options.token ?? "")) return;
  surface = options.surface;
  const touch = visitFirstTouch();
  if (touch) {
    const { first_landing_page: _, ...source } = touch;
    pageSource = source;
  }
  try {
    posthog.init(options.token as string, {
      api_host: `${location.origin}${POSTHOG_PROXY_PATH}`,
      ui_host: "https://eu.posthog.com",
      // Nothing is stored on the device: the public site hashes visitors on PostHog's servers.
      persistence: "memory",
      ...(surface === "public" ? { cookieless_mode: "always" as const } : {}),
      person_profiles: "identified_only",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_performance: false,
      capture_dead_clicks: false,
      save_campaign_params: false,
      save_referrer: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      advanced_disable_feature_flags: true,
      disable_compression: true,
      before_send: (event) => {
        if (!event) return null;
        delete event.$set;
        delete event.$set_once;
        delete event.$unset;
        const ui_locale = AnalyticsLocale.catch("en").parse(document.documentElement.lang);
        if (event.event === "$exception") {
          event.properties = {
            ...exceptionProperties(event.properties),
            token: options.token,
            distinct_id:
              surface === "product" && learner && allowed() ? posthog.get_distinct_id() : "browser",
            surface,
            ui_locale,
            schema_version: ANALYTICS_SCHEMA_VERSION,
            $geoip_disable: true,
            $process_person_profile: false,
          };
          return event;
        }
        if (!allowed()) return null;
        let properties: Record<string, unknown> | null;
        if (event.event === "$set" && learner && accountAllowed) {
          properties = {
            $set: {
              ui_locale,
              ...(INTERNAL_ACCOUNT_IDS.has(learner) ? { is_internal: true } : {}),
            },
          };
        } else if (event.event === "$identify") {
          const anonymous = event.properties.$anon_distinct_id;
          properties =
            typeof anonymous === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(anonymous)
              ? {
                  $anon_distinct_id: anonymous,
                  $set: {
                    ui_locale,
                    ...(INTERNAL_ACCOUNT_IDS.has(posthog.get_distinct_id())
                      ? { is_internal: true }
                      : {}),
                  },
                }
              : null;
        } else properties = eventProperties(event.event, event.properties, "browser");
        if (!properties) return null;
        const cookieless = event.properties.$cookieless_mode === true;
        event.properties = {
          ...properties,
          ...(event.event === "$pageview"
            ? {
                $pathname: properties.pathname,
                $current_url: `${location.origin}${properties.pathname}`,
                ...(properties.referrer ? { $referring_domain: properties.referrer } : {}),
              }
            : {}),
          // PostHog hashes a cookieless visitor from the day, address, host and browser, then drops them.
          ...(cookieless
            ? {
                $cookieless_mode: true,
                $raw_user_agent: event.properties.$raw_user_agent,
              }
            : {}),
          $host: location.hostname,
          $process_person_profile: event.event === "$identify" || !!learner,
          token: options.token,
          distinct_id: posthog.get_distinct_id(),
          surface,
          ui_locale,
          schema_version: ANALYTICS_SCHEMA_VERSION,
          $geoip_disable: true,
        };
        return event;
      },
    });
    initialized = true;
    applyState();
  } catch {
    initialized = false;
  }
}

function applyState(): void {
  if (!initialized || !allowed()) {
    ready = false;
    return;
  }
  identifyLearner();
  capturePageview(location.pathname);
  if (surface === "public") {
    const match = location.pathname.match(/^(?:\/(uk|ru))?\/explore\/([a-z0-9-]+)$/);
    if (match?.[2] && !publicDeckSent) {
      publicDeckSent = true;
      captureAnalytics("public_deck_viewed", {
        deck_slug: match[2],
        locale: AnalyticsLocale.catch("en").parse(document.documentElement.lang),
      });
    }
  }
  if (!ready) {
    ready = true;
    window.dispatchEvent(new Event(ANALYTICS_READY));
  }
}

function identifyLearner(): void {
  if (surface !== "product" || !allowed() || !learner || identifySent === learner) return;
  posthog.identify(learner, {
    ui_locale: AnalyticsLocale.catch("en").parse(document.documentElement.lang),
    ...(INTERNAL_ACCOUNT_IDS.has(learner) ? { is_internal: true } : {}),
  });
  identifySent = learner;
  sendOpening();
}

/** The product reports who is signed in and whether their account turned analytics off. */
export function setAnalyticsLearner(id: string | undefined, permitted = false): void {
  if ((learner && learner !== id) || (identifySent && !permitted)) forget();
  learner = id;
  accountChecked = true;
  accountAllowed = permitted;
  if (initialized) applyState();
}

export function captureAnalytics<N extends AnalyticsName>(
  name: N,
  properties: AnalyticsProperties<N>,
): boolean {
  if (!initialized || !allowed()) return false;
  const approved = eventProperties(name, properties, "browser");
  if (!approved) return false;
  try {
    posthog.capture(name, approved);
    return true;
  } catch {
    return false;
  }
}

export function capturePageview(pathname: string): void {
  if (!initialized || !allowed() || pathname === lastPage) return;
  lastPage = pathname;
  const source = pageSource;
  pageSource = undefined;
  captureAnalytics("$pageview", { pathname: analyticsPath(pathname, surface), ...source });
}

export function reportBrowserException(error: unknown): void {
  if (!initialized) return;
  try {
    posthog.captureException(error);
  } catch {
    /* Monitoring must not recursively report SDK failures. */
  }
}
