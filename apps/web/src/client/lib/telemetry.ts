import posthog from "posthog-js/no-external";
import { exceptionProperties, POSTHOG_HOST } from "../../shared/telemetry";

let enabled = false;
let learner: string | undefined;

export function initTelemetry(): void {
  const token = document.querySelector<HTMLMetaElement>('meta[name="lymi-posthog-token"]')?.content;
  if (
    import.meta.env.DEV ||
    import.meta.env.LYMI_APP_PREVIEW ||
    window.location.origin !== "https://my.lymi.app" ||
    !/^phc_[A-Za-z0-9]+$/.test(token ?? "")
  )
    return;
  try {
    posthog.init(token as string, {
      api_host: POSTHOG_HOST,
      persistence: "memory",
      person_profiles: "never",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_performance: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      advanced_disable_feature_flags: true,
      disable_compression: true,
      ip: false,
      before_send: (event) => {
        if (!event || (event.event !== "$exception" && event.event !== "app_opened")) return null;
        event.properties = {
          ...(event.event === "$exception" ? exceptionProperties(event.properties) : {}),
          distinct_id: learner ?? event.properties.distinct_id,
          token,
          surface: "browser",
          $process_person_profile: false,
          $geoip_disable: true,
        };
        return event;
      },
    });
  } catch {
    return;
  }
  enabled = true;
  window.addEventListener("error", (event) => {
    if (event.error) reportClientException(event.error);
  });
  window.addEventListener("unhandledrejection", (event) => reportClientException(event.reason));
}

export function setTelemetryLearner(id: string | undefined): void {
  if (learner === id) return;
  learner = id;
  if (enabled && id) {
    try {
      posthog.capture("app_opened");
    } catch {
      /* Monitoring cannot interrupt a sign-in. */
    }
  }
}

export function reportClientException(error: unknown): void {
  if (!enabled) return;
  try {
    posthog.captureException(error);
  } catch {
    // Reporting must not interrupt the learner or recursively report an SDK failure.
  }
}
