import { afterEach, beforeEach, expect, it, vi } from "vitest";

type Payload = {
  event: string;
  properties: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
  $unset?: string[];
};
type Options = {
  before_send: (event: Payload) => Payload | null;
  api_host: string;
  persistence: string;
  cookieless_mode?: string;
};
const sdk = vi.hoisted(() => {
  let id = "anonymous";
  let sequence = 0;
  let options: Options | undefined;
  const sent: Payload[] = [];
  const capture = vi.fn((event: string, properties: Record<string, unknown> = {}) => {
    const cookieless = options?.cookieless_mode === "always";
    const payload = options?.before_send({
      event,
      $set: { email: "never@example.com" },
      $set_once: { $initial_current_url: "https://my.lymi.app/private?token=secret" },
      $unset: ["is_internal"],
      properties: {
        ...properties,
        distinct_id: cookieless ? "$posthog_cookieless" : id,
        email: "never@example.com",
        $raw_user_agent: "Test/1.0",
        $current_url: "https://my.lymi.app/private?token=secret",
        ...(cookieless ? { $cookieless_mode: true } : {}),
      },
    });
    if (payload) sent.push(payload);
  });
  return {
    sent,
    capture,
    options: () => options,
    init: vi.fn((_token: string, next: Options) => {
      options = next;
      id = "anonymous";
    }),
    reset: vi.fn(() => {
      id = `anonymous-${++sequence}`;
    }),
    get_distinct_id: () => (options?.cookieless_mode === "always" ? "$posthog_cookieless" : id),
    identify: vi.fn((next: string, props: Record<string, unknown> = {}) => {
      const anonymous = id;
      id = next;
      capture("$identify", { $anon_distinct_id: anonymous, $set: props });
    }),
    captureException: vi.fn(() => capture("$exception", { $exception_list: [] })),
  };
});
vi.mock("posthog-js/no-external", () => ({ default: sdk }));
let cookieWrites: string[];
let analytics: typeof import("./analytics");

async function load(url: string, referrer = "https://example.com/private") {
  vi.resetModules();
  vi.stubGlobal("location", new URL(url));
  const document = Object.assign(new EventTarget(), {
    documentElement: { lang: "uk" },
    referrer,
    visibilityState: "visible",
  });
  Object.defineProperty(document, "cookie", {
    get: () => "",
    set: (value: string) => cookieWrites.push(value),
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", new EventTarget());
  analytics = await import("./analytics");
}

beforeEach(() => {
  vi.clearAllMocks();
  sdk.sent.length = 0;
  cookieWrites = [];
});
afterEach(() => vi.unstubAllGlobals());

it("measures a signed-in learner by default, keyed to the account, without cookies", async () => {
  await load("https://my.lymi.app/today?token=secret");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  expect(sdk.options()).toMatchObject({
    api_host: "https://my.lymi.app/ingest",
    persistence: "memory",
  });
  expect(sdk.options()?.cookieless_mode).toBeUndefined();
  analytics.captureAnalytics("app_opened", {});
  expect(sdk.sent).toEqual([]);
  analytics.setAnalyticsLearner("account-1", true);
  expect(sdk.sent.find((e) => e.event === "$identify")).toMatchObject({
    properties: {
      distinct_id: "account-1",
      $process_person_profile: true,
      $set: { ui_locale: "uk" },
    },
  });
  expect(sdk.sent.find((e) => e.event === "$pageview")).toMatchObject({
    properties: {
      pathname: "/today",
      $current_url: "https://my.lymi.app/today",
      referrer: "example.com",
      $referring_domain: "example.com",
      $geoip_disable: true,
    },
  });
  expect(sdk.sent.filter((e) => e.event === "app_opened")).toHaveLength(1);
  expect(JSON.stringify(sdk.sent)).not.toContain("never@example.com");
  expect(JSON.stringify(sdk.sent)).not.toContain("secret");
  expect(JSON.stringify(sdk.sent)).not.toContain("Test/1.0");
  expect(sdk.sent.every((event) => !event.$set && !event.$set_once && !event.$unset)).toBe(true);
  expect(cookieWrites).toEqual([]);
});

it("stops when the account turns analytics off and keeps errors anonymous", async () => {
  await load("https://my.lymi.app/today");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.setAnalyticsLearner("account-1", true);
  const before = sdk.sent.length;
  analytics.setAnalyticsLearner("account-1", false);
  expect(sdk.reset).toHaveBeenCalled();
  analytics.captureAnalytics("cards_added", { source: "typed", count: 1 });
  analytics.capturePageview("/library");
  expect(sdk.sent).toHaveLength(before);
  analytics.reportBrowserException(new Error("private"));
  expect(sdk.sent.at(-1)).toMatchObject({
    event: "$exception",
    properties: { distinct_id: "browser", $process_person_profile: false },
  });
});

it("counts a signed-out visitor anonymously and joins them to the account they create", async () => {
  await load("https://my.lymi.app/login?mode=sign-up&lp=%2Fteachers&ref=www.google.com");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  expect(sdk.sent).toEqual([]);
  analytics.setAnalyticsLearner(undefined);
  const pageview = sdk.sent.find((e) => e.event === "$pageview");
  expect(pageview).toMatchObject({
    properties: { pathname: "/login", referrer: "www.google.com", $process_person_profile: false },
  });
  const visitor = pageview?.properties.distinct_id;
  analytics.setAnalyticsLearner("account-from-signup", true);
  expect(sdk.sent.find((e) => e.event === "$identify")).toMatchObject({
    properties: { $anon_distinct_id: visitor, distinct_id: "account-from-signup" },
  });
  expect(analytics.visitFirstTouch()).toEqual({
    first_landing_page: "/teachers",
    referrer: "www.google.com",
  });
});

it("resets identity when another account signs in", async () => {
  await load("https://my.lymi.app/today");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.setAnalyticsLearner("first-account", true);
  analytics.setAnalyticsLearner("second-account", true);
  const identifies = sdk.sent.filter((e) => e.event === "$identify");
  expect(identifies.map((e) => e.properties.distinct_id)).toEqual([
    "first-account",
    "second-account",
  ]);
  expect(identifies[1]?.properties.$anon_distinct_id).not.toBe("first-account");
});

it("counts public visitors cookielessly with where they came from and never identifies them", async () => {
  await load(
    "https://lymi.app/explore/eesti-a1?utm_source=lenny&private=secret",
    "https://news.example.com/item?id=1",
  );
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: true });
  expect(sdk.options()).toMatchObject({
    api_host: "https://lymi.app/ingest",
    cookieless_mode: "always",
    persistence: "memory",
  });
  expect(sdk.sent.find((e) => e.event === "$pageview")).toMatchObject({
    properties: {
      pathname: "/explore/eesti-a1",
      referrer: "news.example.com",
      utm_source: "lenny",
      distinct_id: "$posthog_cookieless",
      $cookieless_mode: true,
      $raw_user_agent: "Test/1.0",
      $host: "lymi.app",
      $process_person_profile: false,
    },
  });
  expect(sdk.sent.some((e) => e.event === "public_deck_viewed")).toBe(true);
  analytics.setAnalyticsLearner("account-1", true);
  expect(sdk.identify).not.toHaveBeenCalled();
  expect(JSON.stringify(sdk.sent)).not.toContain("secret");
  expect(cookieWrites).toEqual([]);
});

it("does not initialize in development or previews", async () => {
  await load("https://lymi.app/");
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: false });
  analytics.captureAnalytics("add_to_lymi_clicked", { deck_slug: "eesti-a1" });
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.sent).toEqual([]);
});
