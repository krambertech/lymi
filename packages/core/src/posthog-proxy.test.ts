import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyPostHog } from "./posthog-proxy";

function capture(body: string, init: { type?: string; path?: string } = {}) {
  return new Request(`https://lymi.app/ingest${init.path ?? "/e/"}?ver=1`, {
    method: "POST",
    headers: { "content-type": init.type ?? "application/json", "user-agent": "Test/1.0" },
    body,
  });
}

function sent() {
  const [url, init] = vi.mocked(fetch).mock.calls[0] as [URL, RequestInit];
  return { url: url.toString(), headers: new Headers(init.headers), body: String(init.body) };
}

describe("PostHog proxy", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("adds the edge country and forwards the visitor's address only for cookieless events", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
    const event = { event: "$pageview", properties: { $cookieless_mode: true, pathname: "/" } };
    const response = await proxyPostHog(capture(JSON.stringify(event)), {
      country: "EE",
      ip: "203.0.113.7",
    });
    expect(response.status).toBe(200);
    const request = sent();
    expect(request.url).toBe("https://eu.i.posthog.com/e/?ver=1");
    expect(request.headers.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(request.headers.get("user-agent")).toBe("Test/1.0");
    expect(JSON.parse(request.body).properties).toMatchObject({
      $geoip_disable: true,
      $geoip_country_code: "EE",
      $geoip_country_name: "Estonia",
    });
  });

  it("keeps the address of an identified learner's events from PostHog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}")),
    );
    const batch = { batch: [{ event: "app_opened", properties: { distinct_id: "user" } }] };
    await proxyPostHog(capture(JSON.stringify(batch), { path: "/batch/" }), {
      country: "XX",
      ip: "203.0.113.7",
    });
    const request = sent();
    expect(request.headers.has("x-forwarded-for")).toBe(false);
    const properties = JSON.parse(request.body).batch[0].properties;
    expect(properties.$geoip_disable).toBe(true);
    expect(properties).not.toHaveProperty("$geoip_country_code");
  });

  it("annotates base64 form bodies that page-unload beacons send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}")),
    );
    const data = btoa(JSON.stringify([{ event: "review_session_abandoned", properties: {} }]));
    await proxyPostHog(
      capture(`data=${encodeURIComponent(data)}`, { type: "application/x-www-form-urlencoded" }),
      { country: "UA" },
    );
    const form = new URLSearchParams(sent().body);
    const events = JSON.parse(atob(form.get("data") ?? ""));
    expect(events[0].properties.$geoip_country_code).toBe("UA");
  });

  it("refuses anything but capture endpoints", async () => {
    vi.stubGlobal("fetch", vi.fn());
    expect((await proxyPostHog(capture("{}", { path: "/flags/" }), {})).status).toBe(404);
    expect(
      (await proxyPostHog(new Request("https://lymi.app/ingest/e/", { method: "GET" }), {})).status,
    ).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
});
