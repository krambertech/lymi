import {
  ANALYTICS_CONSENT_VERSION,
  ANALYTICS_SCHEMA_VERSION,
  type AnalyticsConsent,
  AnalyticsLocale,
  type AnalyticsName,
  type AnalyticsProperties,
  ATTRIBUTION_COOKIE,
  analyticsPath,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  eventProperties,
  firstTouch,
  IDENTITY_COOKIE,
  INTERNAL_ACCOUNT_IDS,
  readConsent,
  readCookie,
} from "@lymi/core/analytics";
import { exceptionProperties, POSTHOG_HOST } from "@lymi/core/telemetry";
import posthog from "posthog-js/no-external";

export const ANALYTICS_READY = "lymi:analytics-ready";
let ready = false;
export const CONSENT_CHANGED = "lymi:analytics-consent";
export const OPEN_PRIVACY_PREFERENCES = "lymi:privacy-preferences";
let surface: "public" | "product" = "product";
let initialized = false;
let learner: string | undefined;
let consent: AnalyticsConsent | null = null;
let accountAllowed = false;
let accountChecked = false;
let observedCookie = "";
let observedIdentity = "";
let identifySent: string | undefined;
let lastPage: string | undefined;
let openingSent = false;
let publicDeckSent = false;
let landing: ReturnType<typeof firstTouch> | undefined;

function cookie(name: string, value: string, maxAge = CONSENT_MAX_AGE): void {
  try {
    const production = location.hostname === "lymi.app" || location.hostname === "my.lymi.app";
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${production ? "; Domain=lymi.app; Secure" : ""}`;
  } catch {
    /* Storage restrictions must leave the product usable. */
  }
}

export function analyticsConsent(): AnalyticsConsent | null {
  return typeof document === "undefined" ? null : readConsent(document.cookie);
}

export function setAnalyticsConsent(allowed: boolean, updated_at = Date.now()): void {
  const value = { version: ANALYTICS_CONSENT_VERSION, allowed, updated_at };
  cookie(CONSENT_COOKIE, JSON.stringify(value));
  // A browser that refuses cookies also refuses persistent analytics.
  consent = analyticsConsent();
  if (!allowed) clearAnalyticsIdentity();
  if (initialized) applyConsent();
  window.dispatchEvent(new Event(CONSENT_CHANGED));
}

export function openPrivacyPreferences(event?: { currentTarget: HTMLElement }): void {
  window.dispatchEvent(
    new CustomEvent(OPEN_PRIVACY_PREFERENCES, {
      detail: event?.currentTarget ?? document.activeElement,
    }),
  );
}

function allowed(): boolean {
  return (
    consent?.allowed === true &&
    accountChecked &&
    ((!learner && !identity()?.account) || accountAllowed)
  );
}

function identity(): { id: string; account?: string } | null {
  try {
    const value = JSON.parse(readCookie(document.cookie, IDENTITY_COOKIE) ?? "null");
    if (!value || typeof value.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value.id))
      return null;
    if (value.account !== undefined && value.account !== value.id) return null;
    return value;
  } catch {
    return null;
  }
}

function clearAnalyticsIdentity(): void {
  cookie(IDENTITY_COOKIE, "", 0);
  cookie(ATTRIBUTION_COOKIE, "", 0);
  if (initialized) {
    try {
      posthog.reset();
    } catch {
      /* Monitoring is best effort. */
    }
  }
  observedIdentity = "";
  identifySent = undefined;
  lastPage = undefined;
  openingSent = false;
  if (initialized) landing = firstTouch(location.href, "", surface);
}

export function initAnalytics(options: {
  token?: string | undefined;
  surface: "public" | "product";
  enabled: boolean;
}): void {
  if (initialized || !options.enabled || !/^phc_[A-Za-z0-9]+$/.test(options.token ?? "")) return;
  surface = options.surface;
  consent = analyticsConsent();
  landing = firstTouch(location.href, document.referrer, surface);
  const saved = consent?.allowed ? identity() : null;
  try {
    posthog.init(options.token as string, {
      api_host: POSTHOG_HOST,
      persistence: "memory",
      ...(saved ? { bootstrap: { distinctID: saved.id, isIdentifiedID: !!saved.account } } : {}),
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
      ip: false,
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
            distinct_id: allowed() ? posthog.get_distinct_id() : "browser",
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
        event.properties = {
          ...properties,
          ...(event.event === "$pageview"
            ? {
                $pathname: properties.pathname,
                $current_url: `${location.origin}${properties.pathname}`,
                $host: location.hostname,
              }
            : {}),
          $process_person_profile:
            event.event === "$identify" || !!identity()?.account || !!learner,
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
    observedIdentity = readCookie(document.cookie, IDENTITY_COOKIE) ?? "";
    applyConsent();
    window.addEventListener("focus", refreshConsent);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshConsent();
    });
  } catch {
    initialized = false;
  }
}

function refreshConsent(): void {
  const next = readCookie(document.cookie, CONSENT_COOKIE) ?? "";
  const nextIdentity = readCookie(document.cookie, IDENTITY_COOKIE) ?? "";
  if (
    next === observedCookie &&
    nextIdentity === observedIdentity &&
    consent?.allowed === analyticsConsent()?.allowed
  )
    return;
  if (nextIdentity !== observedIdentity) {
    if (identity()?.account !== learner) {
      accountAllowed = false;
      accountChecked = false;
      learner = undefined;
    }
    try {
      posthog.reset();
      const saved = identity();
      if (saved) {
        if (saved.account) posthog.identify(saved.account);
        else posthog.register({ distinct_id: saved.id });
      }
    } catch {
      /* Storage changes cannot interrupt the product. */
    }
    identifySent = undefined;
    lastPage = undefined;
    openingSent = false;
    observedIdentity = nextIdentity;
  }
  consent = analyticsConsent();
  if (!consent?.allowed) clearAnalyticsIdentity();
  applyConsent();
  window.dispatchEvent(new Event(CONSENT_CHANGED));
}

function applyConsent(): void {
  observedCookie = readCookie(document.cookie, CONSENT_COOKIE) ?? "";
  if (!initialized || !allowed()) {
    ready = false;
    return;
  }
  if (!identity()) {
    posthog.reset();
    cookie(IDENTITY_COOKIE, JSON.stringify({ id: posthog.get_distinct_id() }));
    observedIdentity = readCookie(document.cookie, IDENTITY_COOKIE) ?? "";
    if (!identity()) return;
  }
  if (landing && !readCookie(document.cookie, ATTRIBUTION_COOKIE))
    cookie(ATTRIBUTION_COOKIE, JSON.stringify(landing));
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
  if (!initialized || !allowed() || !learner || identifySent === learner) return;
  const previous = identity();
  if (previous?.account && previous.account !== learner) clearAnalyticsIdentity();
  posthog.identify(learner, {
    ui_locale: AnalyticsLocale.catch("en").parse(document.documentElement.lang),
    ...(INTERNAL_ACCOUNT_IDS.has(learner) ? { is_internal: true } : {}),
  });
  identifySent = learner;
  cookie(IDENTITY_COOKIE, JSON.stringify({ id: learner, account: learner }));
  observedIdentity = readCookie(document.cookie, IDENTITY_COOKIE) ?? "";
  if (surface === "product" && !openingSent) {
    captureAnalytics("app_opened", {});
    openingSent = true;
  }
}

export function setAnalyticsLearner(id: string | undefined, permitted = false): void {
  if (learner && learner !== id) clearAnalyticsIdentity();
  learner = id;
  accountChecked = true;
  accountAllowed = permitted;
  if (!id && identity()?.account) clearAnalyticsIdentity();
  if (initialized) applyConsent();
}

export function captureAnalytics<N extends AnalyticsName>(
  name: N,
  properties: AnalyticsProperties<N>,
): boolean {
  if (!initialized) return false;
  refreshConsent();
  if (!allowed()) return false;
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
  const path = analyticsPath(pathname, surface);
  if (!initialized || !allowed() || pathname === lastPage) return;
  lastPage = pathname;
  captureAnalytics("$pageview", { pathname: path });
}

export function reportBrowserException(error: unknown): void {
  if (!initialized) return;
  try {
    posthog.captureException(error);
  } catch {
    /* Monitoring must not recursively report SDK failures. */
  }
}
