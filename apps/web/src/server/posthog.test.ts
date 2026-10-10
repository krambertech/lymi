import { afterEach, describe, expect, it, vi } from "vitest";
import { productAnalytics, reportServerException } from "./posthog";
import { track } from "./services/analytics";

const production = { PRODUCT_URL: "https://my.lymi.app", POSTHOG_PROJECT_TOKEN: "phc_test" };

function interceptedEvents() {
  const bodies: string[] = [];
  const fetch = vi.fn(async (_url: unknown, init: RequestInit | undefined) => {
    bodies.push(
      typeof init?.body === "string" ? init.body : gunzipSync(init?.body as Uint8Array).toString(),
    );
    return new Response('{"status":1}', { status: 200 });
  });
  vi.stubGlobal("fetch", fetch);
  return { fetch, bodies };
}

afterEach(() => vi.unstubAllGlobals());

describe("PostHog delivery", () => {
  it("mirrors actions with an opaque learner ID and no extra content", async () => {
    const { fetch, bodies } = interceptedEvents();
    const writeDataPoint = vi.fn();
    const analytics = productAnalytics(
      { ...production, EVENTS: { writeDataPoint } as AnalyticsEngineDataset },
      "learner-1",
    );
    const event = {
      name: "card_added" as const,
      source: "manual" as const,
      count: 2,
      term: "private term",
    };
    await analytics.run(async () => track(analytics, event));
    expect(writeDataPoint).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toContain("https://eu.i.posthog.com");
    const body = JSON.parse(bodies[0] ?? "{}");
    expect(body.batch[0]).toMatchObject({
      event: "card_added",
      distinct_id: "learner-1",
      properties: {
        count: 2,
        source: "manual",
        $geoip_disable: true,
        $process_person_profile: false,
      },
    });
    expect(bodies.join()).not.toContain("private term");
  });

  it("redacts SDK exception messages, nested causes and context before delivery", async () => {
    const { bodies } = interceptedEvents();
    const error = new Error("SQL params private term secret-token", {
      cause: new Error("private email@example.com"),
    });
    error.stack =
      "Error: secret-token\n    at saveCard (https://my.lymi.app/assets/cards-abcd.js?token=secret-token:12:4)";
    await reportServerException(production, error, {
      route: "/api/cards/:id",
      method: "PATCH",
      userId: "learner-1",
    });
    const sent = bodies.join();
    expect(sent).toContain("$exception");
    expect(sent).toContain("Unexpected error");
    expect(sent).toContain("/api/cards/:id");
    for (const privateValue of ["private term", "secret-token", "email@example.com", "SQL params"])
      expect(sent).not.toContain(privateValue);
  });

  it("never contacts PostHog in loopback, previews or unconfigured environments", async () => {
    const { fetch } = interceptedEvents();
    for (const env of [
      { ...production, PRODUCT_URL: "http://localhost:5241" },
      { ...production, APP_PREVIEW: "true" },
      { PRODUCT_URL: production.PRODUCT_URL },
    ]) {
      const analytics = productAnalytics(env, "learner-1");
      await analytics.run(async () => track(analytics, { name: "signed_in" }));
      await reportServerException(env, new Error("private"), { route: "/api/me", method: "GET" });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fail a write or exception response when PostHog is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    const analytics = productAnalytics(production, "learner-1");
    await expect(
      analytics.run(async () => {
        track(analytics, { name: "signed_in" });
        return "saved";
      }),
    ).resolves.toBe("saved");
    await expect(
      reportServerException(production, new Error("private"), { route: "/api/me", method: "GET" }),
    ).resolves.toBeUndefined();
  });
});

import { gunzipSync } from "node:zlib";
