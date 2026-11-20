import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@astrojs/cloudflare/handler", () => ({
  handle: () => new Response("page"),
}));

const { default: worker } = await import("./worker");

const BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
let sent: Promise<unknown>[];
let posthog: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sent = [];
  posthog = vi.fn(async () => new Response("{}"));
  vi.stubGlobal("fetch", posthog);
});
afterEach(() => vi.unstubAllGlobals());

async function open(url: string, init: RequestInit = {}) {
  const ctx: Pick<ExecutionContext, "waitUntil"> = { waitUntil: (work) => void sent.push(work) };
  const request = new Request(url, {
    ...init,
    headers: { "user-agent": BROWSER, ...(init.headers as Record<string, string>) },
  });
  const response = await worker.fetch(request, {} as Env, ctx as ExecutionContext);
  await Promise.all(sent);
  return response;
}

function events() {
  return posthog.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

describe("a download link", () => {
  it("redirects to the newest build, uncached, and counts one download", async () => {
    const response = await open("https://lymi.app/download/mac?locale=uk");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://downloads.lymi.app/darwin/arm64/Lymi.dmg",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(events()).toEqual([
      expect.objectContaining({
        event: "mac_download_started",
        properties: expect.objectContaining({ chip: "apple_silicon", ui_locale: "uk" }),
      }),
    ]);
  });

  it("sends Intel Macs to the Intel build", async () => {
    const response = await open("https://lymi.app/download/mac-intel");
    expect(response.headers.get("location")).toBe("https://downloads.lymi.app/darwin/x64/Lymi.dmg");
    expect(events()[0].properties.chip).toBe("intel");
  });

  it.each([
    ["a HEAD request", { method: "HEAD" }],
    ["a POST request", { method: "POST" }],
    ["a prefetch", { headers: { "sec-purpose": "prefetch" } }],
    ["Slack's link preview", { headers: { "user-agent": "Slackbot-LinkExpanding 1.0" } }],
    ["Telegram's link preview", { headers: { "user-agent": "TelegramBot (like TwitterBot)" } }],
    ["a script", { headers: { "user-agent": "curl/8.7.1" } }],
  ])("redirects %s without counting it", async (_, init) => {
    const response = await open("https://lymi.app/download/mac", init);
    expect(response.status).toBe(302);
    expect(posthog).not.toHaveBeenCalled();
  });

  it("counts nothing on a preview or local host", async () => {
    for (const host of ["https://lymi-site.example.workers.dev", "http://localhost:4321"]) {
      const response = await open(`${host}/download/mac`);
      expect(response.status).toBe(302);
    }
    expect(posthog).not.toHaveBeenCalled();
  });

  it("sends the iPhone link to the App Store and counts it", async () => {
    const response = await open("https://lymi.app/download/iphone");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://apps.apple.com/app/id6822912687");
    expect(events()).toEqual([expect.objectContaining({ event: "iphone_download_started" })]);
  });

  it("sends the Android link to Google Play and counts it", async () => {
    const response = await open("https://lymi.app/download/android");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://play.google.com/store/apps/details?id=app.lymi",
    );
    expect(events()).toEqual([expect.objectContaining({ event: "android_download_started" })]);
  });

  it("leaves the download page itself to Astro", async () => {
    expect(await (await open("https://lymi.app/download")).text()).toBe("page");
    expect(posthog).not.toHaveBeenCalled();
  });
});

describe("the App Store check", () => {
  async function check(country?: string) {
    const request = new Request("https://lymi.app/api/app-store");
    if (country) Object.defineProperty(request, "cf", { value: { country } });
    const response = await worker.fetch(request, {} as Env, {} as ExecutionContext);
    const body: { available: boolean } = await response.json();
    return { cache: response.headers.get("cache-control"), body };
  }

  it("shows the link where the App Store sells Lymi", async () => {
    expect(await check("UA")).toEqual({ cache: "private, no-store", body: { available: true } });
    expect((await check("GB")).body.available).toBe(true);
    expect((await check("CH")).body.available).toBe(true);
  });

  it("hides it in the EU until Lymi is on sale there", async () => {
    for (const country of ["EE", "DE", "FR", "PL", "RE", "AX"]) {
      expect((await check(country)).body.available).toBe(false);
    }
  });

  it("shows it when the country is unknown", async () => {
    expect((await check()).body.available).toBe(true);
  });
});
