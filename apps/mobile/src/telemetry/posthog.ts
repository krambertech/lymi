import { i18n } from "@lingui/core";
import {
  ANALYTICS_SCHEMA_VERSION,
  AnalyticsLocale,
  type AnalyticsName,
  type AnalyticsProperties,
  eventProperties,
  INTERNAL_ACCOUNT_IDS,
} from "@lymi/core/analytics";
import { POSTHOG_PROXY_PATH } from "@lymi/core/posthog-proxy";
import { exceptionProperties, POSTHOG_PROJECT_TOKEN } from "@lymi/core/telemetry";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import * as Updates from "expo-updates";
import PostHog, { type PostHogCustomStorage } from "posthog-react-native";
import { API_URL, PHONE_CLIENT } from "../auth/client";
import { withUsageQueue } from "./usage-queue";

// Who sent an event and in which session never outlives the launch; only the queued events do.
const LAUNCH_ONLY = [
  "anonymous_id",
  "distinct_id",
  "device_id",
  "person_mode",
  "enable_person_processing",
  "session_id",
  "session_start_timestamp",
  "session_timestamp",
  "props",
  "person_properties",
];

function withoutIdentity(stored: string): string {
  try {
    const payload = JSON.parse(stored) as { content?: Record<string, unknown> };
    for (const key of LAUNCH_ONLY) delete payload.content?.[key];
    return JSON.stringify(payload);
  } catch {
    return stored;
  }
}

/** The SDK's own file storage, kept so a crash's report and offline events are sent on a later launch. */
const eventQueue: PostHogCustomStorage = {
  getItem: async (key) => {
    try {
      return withoutIdentity(await new File(Paths.document, key).text());
    } catch {
      return null;
    }
  },
  setItem: (key, value) => new File(Paths.document, key).write(withoutIdentity(value)),
};

type PostHogEventProperties = NonNullable<Parameters<PostHog["capture"]>[1]>;

// Unknown while the session loads, null once no one is signed in.
let learner: string | null | undefined;
// Unknown until the learner's settings are read; events wait for it as the web's do.
let consent: boolean | undefined;
let identified: string | undefined;

const allowed = () => !!learner && consent === true;
const sendable = () => (allowed() && identified === learner ? identified : undefined);

const PhonePostHog = withUsageQueue(PostHog, sendable);
let client: InstanceType<typeof PhonePostHog> | undefined;
const uiLocale = () => AnalyticsLocale.catch("en").parse(i18n.locale);
const internal = () => !!learner && INTERNAL_ACCOUNT_IDS.has(learner);

/** What tells the phone apart in every event: its surface and release. */
function release() {
  return {
    token: POSTHOG_PROJECT_TOKEN,
    surface: "phone",
    ui_locale: uiLocale(),
    schema_version: ANALYTICS_SCHEMA_VERSION,
    $os: PHONE_CLIENT?.platform === "android" ? "Android" : "iOS",
    $app_version: PHONE_CLIENT?.version ?? null,
    $app_build: PHONE_CLIENT?.build ?? null,
    app_update: PHONE_CLIENT?.update ?? null,
    $app_namespace: Constants.expoConfig?.ios?.bundleIdentifier ?? null,
    $geoip_disable: true,
  };
}

/**
 * Starts PostHog for usage events and uncaught errors, under the web's privacy rules. Only a
 * release build against production sends. docs/analytics.md.
 */
export function startTelemetry(): void {
  if (__DEV__ || API_URL !== "https://my.lymi.app") return;
  try {
    client = new PhonePostHog(POSTHOG_PROJECT_TOKEN, {
      // Through the Worker, as the web sends, so PostHog's own geolocation never runs.
      host: `${API_URL}${POSTHOG_PROXY_PATH}`,
      // Queued events survive a crash or a launch offline; the identity is set again each launch.
      persistence: "file",
      customStorage: eventQueue,
      personProfiles: "identified_only",
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
      disableRemoteConfig: true,
      disableRemoteFeatureFlags: true,
      preloadFeatureFlags: false,
      disableSurveys: true,
      disableGeoip: true,
      // The proxy reads each event to add the country, so the body stays plain JSON.
      disableCompression: true,
      setDefaultPersonProperties: false,
      errorTracking: {
        autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false },
        exceptionSteps: { enabled: false },
      },
      before_send: (event) => {
        if (!event) return null;
        const properties = event.properties ?? {};
        if (event.event === "$exception") {
          return {
            uuid: event.uuid,
            event: event.event,
            timestamp: event.timestamp,
            properties: {
              ...exceptionProperties(properties),
              // An uncaught error that ends the app is fatal; every other report is an error.
              $exception_level: properties.$exception_level === "fatal" ? "fatal" : "error",
              ...release(),
              ...(internal() ? { is_internal: true } : {}),
              $process_person_profile: false,
            },
          };
        }
        if (!allowed()) return null;
        const profile = { ui_locale: uiLocale(), ...(internal() ? { is_internal: true } : {}) };
        let approved: PostHogEventProperties | null;
        if (event.event === "$identify") {
          const anonymous = properties.$anon_distinct_id;
          approved =
            typeof anonymous === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(anonymous)
              ? { $anon_distinct_id: anonymous }
              : null;
        } else
          approved = eventProperties(
            event.event,
            properties,
            "phone",
          ) as PostHogEventProperties | null;
        if (!approved) return null;
        return {
          uuid: event.uuid,
          event: event.event,
          timestamp: event.timestamp,
          ...(event.event === "$identify" ? { $set: profile } : {}),
          properties: {
            ...approved,
            ...(event.event === "$pageview" ? { $pathname: approved.pathname } : {}),
            ...release(),
            $process_person_profile: true,
          },
        };
      },
    });
  } catch {
    /* Monitoring never stops the app from opening. */
  }
}

let checkedRelease = false;

// Only an explicit link on an internal account's beta can create this source-map probe.
export function verifyReleaseException(): boolean {
  if (!client || !internal() || Updates.channel !== "beta" || checkedRelease) return false;
  try {
    client.captureException(new Error("Phone source-map check"));
    checkedRelease = true;
    void client.flush().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/** Forgets the learner on this phone and drops their unsent usage, so nothing later is joined to them. */
function forget(): void {
  identified = undefined;
  try {
    client?.dropUsage();
    client?.reset();
  } catch {
    /* Monitoring is best effort. */
  }
}

/**
 * Who is signed in, `null` once no one is, and whether their account allows analytics: `undefined`
 * while the settings are unread, when usage is held rather than sent. A signed-in learner is
 * identified by their opaque account ID, as on the web.
 */
export function setTelemetryLearner(
  id: string | null | undefined,
  allows: boolean | undefined,
): void {
  if (id === undefined) return;
  if (id === null || allows === false || (identified && identified !== id)) forget();
  learner = id;
  consent = id ? allows : undefined;
  if (!client || !allowed() || identified === learner || !learner) return;
  try {
    client.identify(learner);
    identified = learner;
    // What was held for this account, from this launch or an earlier one, goes now.
    void client.flush().catch(() => undefined);
  } catch {
    /* Monitoring is best effort. */
  }
}

/** Sends a catalog event the phone owns, unless analytics are off or not yet known. */
export function captureEvent<N extends AnalyticsName>(
  name: N,
  properties: AnalyticsProperties<N>,
): boolean {
  if (!client || !allowed() || identified !== learner) return false;
  const approved = eventProperties(name, properties, "phone");
  if (!approved) return false;
  try {
    client.capture(name, approved as PostHogEventProperties);
    return true;
  } catch {
    return false;
  }
}
