import { ATTRIBUTION_COOKIE, CONSENT_COOKIE, IDENTITY_COOKIE } from "@lymi/core/analytics";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

type Payload = {
  event: string;
  properties: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
  $unset?: string[];
};
const sdk = vi.hoisted(() => {
  let id = "anonymous";
  let sequence = 0;
  let before: (event: Payload) => Payload | null;
  const sent: Payload[] = [];
  const capture = vi.fn((event: string, properties: Record<string, unknown> = {}) => {
    const payload = before?.({
      event,
      $set: { email: "never@example.com" },
      $set_once: { $initial_current_url: "https://my.lymi.app/private?token=secret" },
      $unset: ["is_internal"],
      properties: {
        ...properties,
        distinct_id: id,
        email: "never@example.com",
        $current_url: "https://my.lymi.app/private?token=secret",
      },
    });
    if (payload) sent.push(payload);
  });
  return {
    sent,
    capture,
    init: vi.fn(
      (
        _token: string,
        options: {
          before_send: (event: Payload) => Payload | null;
          bootstrap?: { distinctID: string };
        },
      ) => {
        before = options.before_send;
        id = options.bootstrap?.distinctID ?? "anonymous";
      },
    ),
    reset: vi.fn(() => {
      id = `anonymous-${++sequence}`;
    }),
    get_distinct_id: () => id,
    register: vi.fn((props: { distinct_id: string }) => {
      id = props.distinct_id;
    }),
    identify: vi.fn((next: string, props: Record<string, unknown> = {}) => {
      const anonymous = id;
      id = next;
      capture("$identify", { $anon_distinct_id: anonymous, $set: props });
    }),
    captureException: vi.fn(() => capture("$exception", { $exception_list: [] })),
  };
});
vi.mock("posthog-js/no-external", () => ({ default: sdk }));
let cookies: Map<string, string>;
let analytics: typeof import("./analytics");
beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  sdk.sent.length = 0;
  cookies = new Map();
  const document = Object.assign(new EventTarget(), {
    documentElement: { lang: "uk" },
    referrer: "https://example.com/private",
    visibilityState: "visible",
  });
  Object.defineProperty(document, "cookie", {
    get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
    set: (value: string) => {
      const pair = value.split(";")[0] ?? "";
      const index = pair.indexOf("=");
      const key = pair.slice(0, index);
      const val = pair.slice(index + 1);
      if (value.includes("Max-Age=0")) cookies.delete(key);
      else cookies.set(key, val);
    },
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("location", new URL("https://my.lymi.app/today?token=secret"));
  analytics = await import("./analytics");
  analytics.setAnalyticsLearner(undefined);
});
afterEach(() => vi.unstubAllGlobals());
it("waits for consent, identifies with an opaque ID and removes SDK context", () => {
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.captureAnalytics("app_opened", {});
  expect(sdk.sent).toEqual([]);
  analytics.setAnalyticsConsent(true);
  expect(sdk.sent[0]).toMatchObject({
    event: "$pageview",
    properties: {
      pathname: "/today",
      $current_url: "https://my.lymi.app/today",
      $process_person_profile: false,
      ui_locale: "uk",
    },
  });
  analytics.setAnalyticsLearner("account-1", false);
  expect(sdk.identify).not.toHaveBeenCalled();
  analytics.setAnalyticsLearner("account-1", true);
  expect(sdk.sent.find((e) => e.event === "$identify")).toMatchObject({
    properties: {
      distinct_id: "account-1",
      $process_person_profile: true,
      $set: { ui_locale: "uk" },
    },
  });
  expect(cookies.has(IDENTITY_COOKIE)).toBe(true);
  expect(JSON.stringify(sdk.sent)).not.toContain("never@example.com");
  expect(JSON.stringify(sdk.sent)).not.toContain("secret");
  expect(sdk.sent.every((event) => !event.$set && !event.$set_once && !event.$unset)).toBe(true);
  const before = sdk.sent.length;
  analytics.setAnalyticsConsent(false);
  analytics.captureAnalytics("cards_added", { source: "typed", count: 1 });
  expect(sdk.sent).toHaveLength(before);
  expect(cookies.has(IDENTITY_COOKIE)).toBe(false);
  expect(cookies.has(ATTRIBUTION_COOKIE)).toBe(false);
  analytics.reportBrowserException(new Error("private"));
  expect(sdk.sent.at(-1)).toMatchObject({
    event: "$exception",
    properties: { distinct_id: "browser", $process_person_profile: false },
  });
});
it("resets identity on account switching and detects withdrawal by another tab", () => {
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.setAnalyticsConsent(true);
  analytics.setAnalyticsLearner("first-account", true);
  const old = sdk.get_distinct_id();
  analytics.setAnalyticsLearner("second-account", true);
  const identifies = sdk.sent.filter((e) => e.event === "$identify");
  expect(identifies.at(-1)?.properties.$anon_distinct_id).not.toBe(old);
  const before = sdk.sent.length;
  cookies.set(
    CONSENT_COOKIE,
    encodeURIComponent(JSON.stringify({ allowed: false, updated_at: Date.now(), version: 1 })),
  );
  window.dispatchEvent(new Event("focus"));
  analytics.captureAnalytics("app_opened", {});
  expect(sdk.sent).toHaveLength(before);
  expect(cookies.has(IDENTITY_COOKIE)).toBe(false);
});
it("blocks a shared identified visitor until the account preference is checked", () => {
  cookies.set(
    CONSENT_COOKIE,
    encodeURIComponent(JSON.stringify({ allowed: true, updated_at: Date.now(), version: 1 })),
  );
  cookies.set(
    IDENTITY_COOKIE,
    encodeURIComponent(JSON.stringify({ id: "account-1", account: "account-1" })),
  );
  vi.stubGlobal("location", new URL("https://lymi.app/explore/eesti-a1?private=secret"));
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: true });
  expect(sdk.sent).toEqual([]);
  analytics.setAnalyticsLearner("account-1", true);
  expect(sdk.sent.some((e) => e.event === "public_deck_viewed")).toBe(true);
  expect(sdk.sent.some((e) => e.event === "app_opened")).toBe(false);
});
it("does not initialize in development or previews", () => {
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: false });
  analytics.setAnalyticsConsent(true);
  analytics.captureAnalytics("app_opened", {});
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.sent).toEqual([]);
});

it("checks the account before treating a fresh opted-in browser as anonymous", async () => {
  vi.resetModules();
  analytics = await import("./analytics");
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: true });
  analytics.setAnalyticsConsent(true);
  analytics.captureAnalytics("$pageview", { pathname: "/" });
  expect(sdk.sent).toEqual([]);
  expect(cookies.has(IDENTITY_COOKIE)).toBe(false);
  analytics.setAnalyticsLearner("account-withdrawn", false);
  expect(sdk.sent).toEqual([]);
  analytics.setAnalyticsLearner(undefined);
  expect(sdk.sent.some((event) => event.event === "$pageview")).toBe(true);
});
