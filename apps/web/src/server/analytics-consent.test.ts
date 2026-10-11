import { beforeAll, expect, it } from "vitest";
import { json, PUBLIC_SITE_URL, type Session, type TestApp, testApp } from "./test-app";

let app: TestApp;
let session: Session;
beforeAll(async () => {
  app = await testApp();
  session = await app.signUp("privacy-choice");
}, 60000);
it("allows credentialed privacy requests only from the canonical public origin", async () => {
  const preflight = await app.fetch("/api/settings/analytics-consent", {
    method: "OPTIONS",
    headers: {
      origin: PUBLIC_SITE_URL,
      "access-control-request-method": "PUT",
      "access-control-request-headers": "content-type",
    },
  });
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get("access-control-allow-origin")).toBe(PUBLIC_SITE_URL);
  expect(preflight.headers.get("access-control-allow-credentials")).toBe("true");
  const response = await app.fetch("/api/settings/analytics-consent", {
    ...json(
      { version: 1, allowed: false, updated_at: Date.now() },
      { method: "PUT", headers: { origin: PUBLIC_SITE_URL } },
    ),
    as: session,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ analyticsConsent: false });
  const read = await app.fetch("/api/settings/analytics-consent", {
    as: session,
    headers: { origin: PUBLIC_SITE_URL },
  });
  expect(read.status).toBe(200);
  expect(read.headers.get("access-control-allow-origin")).toBe(PUBLIC_SITE_URL);
  const denied = await app.fetch("/api/settings/analytics-consent", {
    ...json(
      { version: 1, allowed: true, updated_at: Date.now() },
      { method: "PUT", headers: { origin: "https://unrelated.example" } },
    ),
    as: session,
  });
  expect(denied.status).toBe(403);
  const anonymous = await app.fetch("/api/settings/analytics-consent", {
    headers: { origin: PUBLIC_SITE_URL },
  });
  expect(anonymous.status).toBe(401);
  const unrelated = await app.fetch("/api/settings", {
    as: session,
    headers: { origin: PUBLIC_SITE_URL },
  });
  expect(unrelated.headers.get("access-control-allow-origin")).toBeNull();
});
