import { i18n } from "@lingui/core";
import { ANALYTICS_SCHEMA_VERSION, AnalyticsLocale } from "@lymi/core/analytics";
import { POSTHOG_PROXY_PATH } from "@lymi/core/posthog-proxy";
import { exceptionProperties, POSTHOG_PROJECT_TOKEN } from "@lymi/core/telemetry";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import PostHog, { type PostHogCustomStorage } from "posthog-react-native";
import { API_URL, PHONE_CLIENT } from "../auth/client";

// Who sent a report and in which session never outlives the launch; only the queued reports do.
const LAUNCH_ONLY = [
  "anonymous_id",
  "distinct_id",
  "device_id",
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

/** The SDK's own file storage, kept so a crash's report is sent on the next launch. */
const reportQueue: PostHogCustomStorage = {
  getItem: async (key) => {
    try {
      return withoutIdentity(await new File(Paths.document, key).text());
    } catch {
      return null;
    }
  },
  setItem: (key, value) => new File(Paths.document, key).write(withoutIdentity(value)),
};

/**
 * Reports uncaught errors and unhandled promise rejections to PostHog Error Tracking, scrubbed
 * as the web's are. Only a release build against production reports. docs/analytics.md.
 */
export function startExceptionReporting(): void {
  if (__DEV__ || API_URL !== "https://my.lymi.app") return;
  try {
    new PostHog(POSTHOG_PROJECT_TOKEN, {
      // Through the Worker, as the web sends, so PostHog's own geolocation never runs.
      host: `${API_URL}${POSTHOG_PROXY_PATH}`,
      // Queued reports survive a crash; the anonymous ID lasts one launch and is never joined to the learner.
      persistence: "file",
      customStorage: reportQueue,
      personProfiles: "never",
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
        if (event?.event !== "$exception") return null;
        const properties = event.properties ?? {};
        return {
          uuid: event.uuid,
          event: event.event,
          timestamp: event.timestamp,
          properties: {
            ...exceptionProperties(properties),
            // An uncaught error that ends the app is fatal; every other report is an error.
            $exception_level: properties.$exception_level === "fatal" ? "fatal" : "error",
            token: POSTHOG_PROJECT_TOKEN,
            surface: "phone",
            ui_locale: AnalyticsLocale.catch("en").parse(i18n.locale),
            schema_version: ANALYTICS_SCHEMA_VERSION,
            $os: PHONE_CLIENT?.platform === "android" ? "Android" : "iOS",
            $app_version: PHONE_CLIENT?.version ?? null,
            $app_build: PHONE_CLIENT?.build ?? null,
            $app_namespace: Constants.expoConfig?.ios?.bundleIdentifier ?? null,
            $geoip_disable: true,
            $process_person_profile: false,
          },
        };
      },
    });
  } catch {
    /* Monitoring never stops the app from opening. */
  }
}
