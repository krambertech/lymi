import type { PhoneClient } from "@lymi/core";
import { ANALYTICS_SCHEMA_VERSION, AnalyticsLocale, eventProperties } from "@lymi/core/analytics";
import { exceptionProperties, POSTHOG_HOST } from "@lymi/core/telemetry";
import { PostHog } from "posthog-node";
import type { Db } from "./db";
import type { Bindings } from "./env";
import { type AnalyticsEvent, type AnalyticsWriter, track } from "./services/analytics";
import { analyticsContextFor } from "./services/analytics-context";

type TelemetryEnv = { PRODUCT_URL: string } & Partial<
  Pick<Bindings, "POSTHOG_PROJECT_TOKEN" | "EVENTS" | "CF_VERSION_METADATA" | "APP_PREVIEW">
>;
type Defer = (work: Promise<unknown>) => void;
type AnalyticsContext = () => Promise<{
  allowed: boolean;
  ui_locale: "en" | "uk" | "ru";
  is_internal?: true;
  phone?: PhoneClient;
}>;

/** An outcome the phone asked for names its release, as the phone's own events do. */
function phoneProperties(phone: PhoneClient | undefined) {
  if (!phone) return {};
  return {
    client: "phone",
    $os: phone.platform === "android" ? "Android" : "iOS",
    $app_version: phone.version,
    ...(phone.build ? { $app_build: phone.build } : {}),
    ...(phone.update ? { app_update: phone.update } : {}),
  };
}

export function posthogEnabled(env: TelemetryEnv): boolean {
  return (
    env.PRODUCT_URL === "https://my.lymi.app" &&
    env.APP_PREVIEW !== "true" &&
    /^phc_[A-Za-z0-9]+$/.test(env.POSTHOG_PROJECT_TOKEN ?? "")
  );
}

function clientFor(env: TelemetryEnv): PostHog | undefined {
  if (!posthogEnabled(env)) return;
  return new PostHog(env.POSTHOG_PROJECT_TOKEN as string, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2500,
    fetchRetryCount: 0,
    disableGeoip: true,
    before_send: (event) => {
      if (!event) return null;
      if (event.event === "$exception") {
        event.properties = {
          ...exceptionProperties(event.properties ?? {}),
          route: event.properties?.route,
          method: event.properties?.method,
          surface: "worker",
          ui_locale: AnalyticsLocale.catch("en").parse(event.properties?.ui_locale),
          schema_version: ANALYTICS_SCHEMA_VERSION,
          release: env.CF_VERSION_METADATA?.tag ?? null,
          $process_person_profile: false,
          $geoip_disable: true,
        };
      }
      return event;
    },
  });
}

export function productAnalytics(
  env: TelemetryEnv,
  userId: string,
  defer?: Defer,
  context?: AnalyticsContext,
): AnalyticsWriter & {
  flush: () => Promise<void>;
  run: <T>(work: () => Promise<T>) => Promise<T>;
} {
  const client = clientFor(env);
  const pending: Promise<unknown>[] = [];
  const flush = async () => {
    await Promise.all(pending.splice(0));
  };
  return {
    writeDataPoint: (point) => env.EVENTS?.writeDataPoint(point),
    capture: (event: AnalyticsEvent) => {
      if (!client) return;
      const work = (async () => {
        if (!context) return;
        const metadata = await context();
        if (!metadata.allowed) return;
        const properties = eventProperties(event.name, event, "worker");
        if (!properties) return;
        await client.captureImmediate({
          distinctId: userId,
          event: event.name,
          properties: {
            ...properties,
            ...phoneProperties(metadata.phone),
            ui_locale: metadata.ui_locale,
            surface: "worker",
            schema_version: ANALYTICS_SCHEMA_VERSION,
            $set: {
              ui_locale: metadata.ui_locale,
              ...(metadata.is_internal ? { is_internal: true } : {}),
            },
          },
        });
      })().catch(() => {});
      if (defer) defer(work);
      else pending.push(work);
    },
    later: (work) => {
      if (!client) return;
      const run = work().catch(() => {});
      if (defer) defer(run);
      else pending.push(run);
    },
    flush,
    run: async (work) => {
      try {
        return await work();
      } finally {
        await flush();
      }
    },
  };
}

/** Analytics for a deck owner's account, for work a visitor or the cron started on their cards. */
export function ownerAnalytics(env: TelemetryEnv, db: Db, defer: Defer) {
  return (userId: string) => productAnalytics(env, userId, defer, analyticsContextFor(db, userId));
}

export async function trackProductEvent(
  env: TelemetryEnv,
  userId: string,
  event: AnalyticsEvent,
  defer?: Defer,
  context?: AnalyticsContext,
): Promise<void> {
  const analytics = productAnalytics(env, userId, defer, context);
  track(analytics, event);
  await analytics.flush();
}

export async function reportServerException(
  env: TelemetryEnv,
  error: unknown,
  context: { route: string; method: string; userId?: string | undefined },
): Promise<void> {
  try {
    const client = clientFor(env);
    if (!client) return;
    await client.captureExceptionImmediate(error, context.userId ?? "server", {
      route: context.route,
      method: context.method,
    });
  } catch {
    // An unavailable monitoring service cannot change the product response.
  }
}

/**
 * Erases a deleted account's PostHog person and its events. Needs a personal key with person
 * write scope; without one the person stays, keyed only by the id that no longer exists.
 */
export async function erasePostHogPerson(
  env: Pick<Bindings, "POSTHOG_PERSONAL_API_KEY" | "POSTHOG_PROJECT_ID">,
  userId: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!env.POSTHOG_PERSONAL_API_KEY || !env.POSTHOG_PROJECT_ID) return false;
  try {
    const response = await fetcher(
      `${POSTHOG_HOST.replace(".i.", ".")}/api/projects/${encodeURIComponent(env.POSTHOG_PROJECT_ID)}/persons/bulk_delete/`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ distinct_ids: [userId], delete_events: true }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}
