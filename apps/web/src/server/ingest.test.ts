import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { type TestApp, testApp } from "./test-app";

let app: TestApp;
beforeAll(async () => {
  app = await testApp();
}, 60_000);
afterEach(() => vi.unstubAllGlobals());

it("forwards the product's analytics to PostHog without a session", async () => {
  const upstream = vi.fn(async () => new Response('{"status":1}'));
  vi.stubGlobal("fetch", upstream);
  const response = await app.fetch("/ingest/e/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event: "app_opened", properties: { distinct_id: "account" } }),
  });
  expect(response.status).toBe(200);
  expect(String((upstream.mock.calls[0] as unknown[])[0])).toBe("https://eu.i.posthog.com/e/");
  expect((await app.fetch("/ingest/flags/", { method: "POST", body: "{}" })).status).toBe(404);
});
