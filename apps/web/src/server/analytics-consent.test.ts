import { beforeAll, expect, it } from "vitest";
import {
  json,
  PRODUCT_URL,
  PUBLIC_SITE_URL,
  type Session,
  type TestApp,
  testApp,
} from "./test-app";

let app: TestApp;
let session: Session;
beforeAll(async () => {
  app = await testApp();
  session = await app.signUp("privacy-choice");
}, 60000);
it("changes the account's analytics choice only from the product itself", async () => {
  const response = await app.fetch("/api/settings/analytics-consent", {
    ...json(
      { version: 1, allowed: false, updated_at: Date.now() },
      { method: "PUT", headers: { origin: PRODUCT_URL } },
    ),
    as: session,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ analyticsConsent: false });
  for (const origin of [PUBLIC_SITE_URL, "https://unrelated.example"]) {
    const denied = await app.fetch("/api/settings/analytics-consent", {
      ...json(
        { version: 1, allowed: true, updated_at: Date.now() },
        { method: "PUT", headers: { origin } },
      ),
      as: session,
    });
    expect(denied.status).toBe(403);
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  }
  const anonymous = await app.fetch("/api/settings/analytics-consent");
  expect(anonymous.status).toBe(401);
});
