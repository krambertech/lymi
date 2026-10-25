import { INTERNAL_ACCOUNT_IDS } from "@lymi/core/analytics";
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
  session_recording?: {
    maskAllInputs?: boolean;
    maskCapturedNetworkRequestFn?: (request: { name: string }) => { name: string };
    maskAttributeFn?: (name: string, value: string) => string;
  };
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
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
    captureException: vi.fn((_error: unknown, properties: Record<string, unknown> = {}) =>
      capture("$exception", { $exception_list: [], ...properties }),
    ),
  };
});
vi.mock("posthog-js/no-external", () => ({ default: sdk }));
vi.mock("posthog-js/dist/posthog-recorder", () => ({}));
let cookieWrites: string[];
let analytics: typeof import("./analytics");

async function load(url: string, referrer = "https://example.com/private") {
  vi.resetModules();
  vi.stubGlobal("location", new URL(url));
  const document = Object.assign(new EventTarget(), {
    querySelector: () => null,
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
  // The opening waits for the deck list, so it can say what was due.
  expect(sdk.sent.filter((e) => e.event === "app_opened")).toHaveLength(0);
  analytics.setAnalyticsOpening("21-100");
  analytics.setAnalyticsOpening("100+");
  expect(sdk.sent.filter((e) => e.event === "app_opened")).toMatchObject([
    { properties: { entry: "link", backlog: "21-100" } },
  ]);
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

it("tags an error with its route pattern and the release that threw it", async () => {
  await load("https://my.lymi.app/explore/private-deck?token=secret");
  analytics.initAnalytics({
    token: "phc_test",
    surface: "product",
    enabled: true,
    release: "0123456789abcdef0123456789abcdef01234567",
  });
  analytics.reportBrowserException(new TypeError("private"));
  expect(sdk.sent.at(-1)?.properties).toMatchObject({
    route: "/explore/:item",
    release: "0123456789abcdef0123456789abcdef01234567",
  });
  expect(JSON.stringify(sdk.sent.at(-1))).not.toContain("private-deck");
});

it("names the handler that caught an error and drops any other label", async () => {
  await load("https://my.lymi.app/review");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.reportBrowserException(new TypeError("private"), "rejection");
  expect(sdk.sent.at(-1)?.properties).toMatchObject({ caught_by: "rejection" });
  sdk.captureException(new TypeError("private"), { caught_by: "private label" });
  expect(sdk.sent.at(-1)?.properties).not.toHaveProperty("caught_by");
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

it("names a reminder as the way in, and opens without a backlog when none is known", async () => {
  await load("https://my.lymi.app/review?lymi_entry=reminder&deck=italian", "");
  const replaceState = vi.fn();
  vi.stubGlobal("history", { state: null, replaceState });
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.setAnalyticsOpening();
  expect(sdk.sent.filter((e) => e.event === "app_opened")).toEqual([]);
  analytics.setAnalyticsLearner("account-1", true);
  const [opened] = sdk.sent.filter((e) => e.event === "app_opened");
  expect(opened?.properties).toMatchObject({ entry: "reminder" });
  expect(opened?.properties).not.toHaveProperty("backlog");
  expect(String(replaceState.mock.calls[0]?.[2])).toBe("https://my.lymi.app/review?deck=italian");
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

it("marks the first page view of a visit with no referrer as direct", async () => {
  await load("https://lymi.app/", "");
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: true });
  analytics.capturePageview("/explore");
  const pageviews = sdk.sent.filter((e) => e.event === "$pageview");
  expect(pageviews.map((e) => e.properties.$referring_domain)).toEqual(["$direct", undefined]);
});

it("does not initialize in development or previews", async () => {
  await load("https://lymi.app/");
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: false });
  analytics.captureAnalytics("add_to_lymi_clicked", { deck_slug: "eesti-a1" });
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.sent).toEqual([]);
});

type Preloaded = { _POSTHOG_REMOTE_CONFIG?: Record<string, { config: unknown }> };
const recorderLoaded = () => new Promise((resolve) => setTimeout(resolve));

it("records the product only once the account allows it, and stops on opt-out", async () => {
  await load("https://my.lymi.app/today");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  expect((window as Preloaded)._POSTHOG_REMOTE_CONFIG?.phc_test).toMatchObject({
    config: { sessionRecording: { endpoint: "/s/" } },
  });
  expect(sdk.options()?.session_recording?.maskAllInputs).toBe(true);
  await recorderLoaded();
  expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  analytics.setAnalyticsLearner("account-1", true, true);
  await recorderLoaded();
  expect(sdk.startSessionRecording).toHaveBeenCalledTimes(1);
  analytics.setAnalyticsLearner("account-1", false, true);
  expect(sdk.stopSessionRecording).toHaveBeenCalledTimes(1);
});

it("stops recording when the learner turns session replay off, and keeps their events", async () => {
  await load("https://my.lymi.app/today");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.setAnalyticsLearner("account-1", true, false);
  await recorderLoaded();
  expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  analytics.setAnalyticsLearner("account-1", true, true);
  await recorderLoaded();
  expect(sdk.startSessionRecording).toHaveBeenCalledTimes(1);
  analytics.setAnalyticsLearner("account-1", true, false);
  expect(sdk.stopSessionRecording).toHaveBeenCalledTimes(1);
  expect(
    analytics.captureAnalytics("welcome_step_viewed", { step_name: "goal", skipped: false }),
  ).toBe(true);
  const before = sdk.sent.length;
  sdk.capture("$snapshot", { $snapshot_data: [], $session_id: "session" });
  expect(sdk.sent).toHaveLength(before);
});

it("sends a snapshot with only its recording and keeps tokens out of recorded addresses", async () => {
  await load("https://my.lymi.app/today");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.setAnalyticsLearner("account-1", true, true);
  sdk.capture("$snapshot", {
    $snapshot_data: [{ type: 2 }],
    $snapshot_bytes: 10,
    $session_id: "session",
    $window_id: "window",
    $lib: "web",
    $lib_version: "1",
  });
  const snapshot = sdk.sent.at(-1);
  expect(snapshot?.event).toBe("$snapshot");
  expect(snapshot?.properties).toEqual({
    $snapshot_data: [{ type: 2 }],
    $snapshot_bytes: 10,
    $session_id: "session",
    $window_id: "window",
    $lib: "web",
    $lib_version: "1",
    token: "phc_test",
    distinct_id: "account-1",
  });
  const mask = sdk.options()?.session_recording?.maskCapturedNetworkRequestFn;
  expect(mask?.({ name: "https://my.lymi.app/join/secret-token?ref=x" }).name).toBe(
    "https://my.lymi.app/join/:item",
  );
  const attribute = sdk.options()?.session_recording?.maskAttributeFn;
  expect(attribute?.("aria-label", "Options for Kateryna")).toBe("********************");
  expect(attribute?.("class", "grid gap-1")).toBe("grid gap-1");
  analytics.setAnalyticsLearner("account-1", false);
  const before = sdk.sent.length;
  sdk.capture("$snapshot", { $snapshot_data: [], $session_id: "session" });
  expect(sdk.sent).toHaveLength(before);
});

it("never records a signed-out visitor or an internal account", async () => {
  await load("https://my.lymi.app/login");
  analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
  analytics.setAnalyticsLearner(undefined);
  await recorderLoaded();
  expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  const [internal] = INTERNAL_ACCOUNT_IDS;
  analytics.setAnalyticsLearner(internal, true, true);
  await recorderLoaded();
  expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  const before = sdk.sent.length;
  sdk.capture("$snapshot", { $snapshot_data: [], $session_id: "session" });
  expect(sdk.sent).toHaveLength(before);
});

it("never records the public site", async () => {
  await load("https://lymi.app/");
  analytics.initAnalytics({ token: "phc_test", surface: "public", enabled: true });
  await recorderLoaded();
  expect((window as Preloaded)._POSTHOG_REMOTE_CONFIG).toBeUndefined();
  expect(sdk.startSessionRecording).not.toHaveBeenCalled();
  const before = sdk.sent.length;
  sdk.capture("$snapshot", { $snapshot_data: [], $session_id: "session" });
  expect(sdk.sent).toHaveLength(before);
});
