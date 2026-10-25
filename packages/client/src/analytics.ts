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
let replayAllowed = false;
let accountChecked = false;
let identifySent: string | undefined;
let lastPage: string | undefined;
let openingSent = false;
let opening: AnalyticsProperties<"app_opened"> | undefined;
let publicDeckSent = false;
let pageSource: Omit<Attribution, "first_landing_page"> | undefined;
let entryPending = true;
let directEntry = false;
let release: string | undefined;
let replay: "off" | "loading" | "on" = "off";

/**
 * Session replay for the product. The free plan holds 10,000 web recordings a month; lower
 * `sampleRate` before traffic outgrows it. PostHog's remote config is never fetched, so the SDK
 * reads this one instead.
 */
const REPLAY_CONFIG = {
  hasFeatureFlags: false,
  sessionRecording: { endpoint: "/s/", sampleRate: "1.00", minimumDurationMilliseconds: 2000 },
};
const SNAPSHOT_PROPERTIES = [
  "$snapshot_data",
  "$snapshot_bytes",
  "$session_id",
  "$window_id",
  "$lib",
  "$lib_version",
] as const;
// A recording never shows these, and they can carry a card's words or a name.
const HIDDEN_ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "title",
  "alt",
]);

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

const fromReminder = (url: string) =>
  new URL(url).searchParams.get(REMINDER_ENTRY.key) === REMINDER_ENTRY.value;

/**
 * How this page load began: a reminder's link, a link from another site, or neither. The address
 * still carries a reminder's mark after sign-in, which returns to it.
 */
function arrivalEntry(): "reminder" | "link" | "direct" {
  try {
    if ((arrival && fromReminder(arrival.url)) || fromReminder(location.href)) return "reminder";
  } catch {
    return "direct";
  }
  return visitFirstTouch("product")?.referrer ? "link" : "direct";
}

function sendOpening(): void {
  if (openingSent || !opening || !learner || identifySent !== learner) return;
  if (!captureAnalytics("app_opened", { entry: arrivalEntry(), ...opening })) return;
  openingSent = true;
  dropReminderMark();
}

/** Once the opening is counted, a reload of the same address is not another reminder. */
function dropReminderMark(): void {
  try {
    const url = new URL(location.href);
    if (!fromReminder(url.href)) return;
    url.searchParams.delete(REMINDER_ENTRY.key);
    history.replaceState(history.state, "", url);
  } catch {
    /* The mark only costs a duplicate opening on reload. */
  }
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
  /** The commit the running bundle was built from, so an error can be matched to its deploy. */
  release?: string | undefined;
}): void {
  if (initialized || !options.enabled || !/^phc_[A-Za-z0-9]+$/.test(options.token ?? "")) return;
  surface = options.surface;
  release =
    options.release && /^[0-9a-f]{7,40}$/.test(options.release) ? options.release : undefined;
  const touch = visitFirstTouch();
  if (touch) {
    const { first_landing_page: _, ...source } = touch;
    pageSource = source;
  }
  try {
    if (surface === "product") {
      const preloaded = window as { _POSTHOG_REMOTE_CONFIG?: Record<string, { config: unknown }> };
      preloaded._POSTHOG_REMOTE_CONFIG = {
        ...preloaded._POSTHOG_REMOTE_CONFIG,
        [options.token as string]: { config: REPLAY_CONFIG },
      };
    }
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
      // Started once the account allows it. Every word, input and picture is masked: a recording
      // shows layout, clicks and scrolling only.
      disable_session_recording: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        blockSelector: "img, picture, video, canvas, svg image",
        maskAttributeFn: (name, value) =>
          HIDDEN_ATTRIBUTES.has(name) ? "*".repeat(value.length) : value,
        // A recorded address keeps only its route, so tokens and IDs in it never leave.
        maskCapturedNetworkRequestFn: (request) => {
          try {
            const url = new URL(request.name, location.origin);
            return { ...request, name: url.origin + analyticsPath(url.pathname, surface) };
          } catch {
            return { ...request, name: location.origin };
          }
        },
      },
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
            route: analyticsPath(location.pathname, surface),
            ...(release ? { release } : {}),
            ...(CAUGHT_BY.has(event.properties.caught_by)
              ? { caught_by: event.properties.caught_by }
              : {}),
            ui_locale,
            schema_version: ANALYTICS_SCHEMA_VERSION,
            $geoip_disable: true,
            $process_person_profile: false,
          };
          return event;
        }
        if (!allowed()) return null;
        if (event.event === "$snapshot") {
          if (!recordable()) return null;
          const snapshot: Record<string, unknown> = {};
          for (const key of SNAPSHOT_PROPERTIES) snapshot[key] = event.properties[key];
          event.properties = {
            ...snapshot,
            token: options.token,
            distinct_id: posthog.get_distinct_id(),
          };
          return event;
        }
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
                // PostHog's channel type reads an empty referrer as Unknown, so a direct visit says so.
                ...(properties.referrer
                  ? { $referring_domain: properties.referrer }
                  : directEntry
                    ? { $referring_domain: "$direct" }
                    : {}),
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
  applyReplay();
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

/** Replay records signed-in learners only: a signed-out visitor has no setting to object with. */
function recordable(): boolean {
  return (
    surface === "product" &&
    allowed() &&
    replayAllowed &&
    !!learner &&
    !INTERNAL_ACCOUNT_IDS.has(learner)
  );
}

/** The recorder is a chunk of its own, loaded only when a product page may be recorded. */
function applyReplay(): void {
  if (!initialized || surface !== "product") return;
  if (!recordable()) {
    if (replay === "on") posthog.stopSessionRecording();
    replay = "off";
    return;
  }
  if (replay !== "off") return;
  replay = "loading";
  import("posthog-js/dist/posthog-recorder")
    .then(() => {
      if (replay !== "loading" || !recordable()) return;
      replay = "on";
      posthog.startSessionRecording();
    })
    .catch(() => {
      replay = "off";
    });
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
export function setAnalyticsLearner(
  id: string | undefined,
  permitted = false,
  /** Whether the account left session replay on in Settings. */
  replay = false,
): void {
  if ((learner && learner !== id) || (identifySent && !permitted)) forget();
  learner = id;
  accountChecked = true;
  accountAllowed = permitted;
  replayAllowed = replay;
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
  directEntry = entryPending && !source?.referrer;
  entryPending = false;
  captureAnalytics("$pageview", { pathname: analyticsPath(pathname, surface), ...source });
  directEntry = false;
}

/** Which handler caught a browser error, so a report without a stack still says where it surfaced. */
export type CaughtBy = "window" | "rejection" | "router" | "react";
const CAUGHT_BY = new Set<unknown>(["window", "rejection", "router", "react"] satisfies CaughtBy[]);

export function reportBrowserException(error: unknown, caughtBy?: CaughtBy): void {
  if (!initialized) return;
  try {
    posthog.captureException(error, caughtBy ? { caught_by: caughtBy } : undefined);
  } catch {
    /* Monitoring must not recursively report SDK failures. */
  }
}
