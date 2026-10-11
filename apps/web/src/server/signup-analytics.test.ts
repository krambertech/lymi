import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import * as posthog from "./posthog";
import { getSettings } from "./services/settings";
import { type TestApp, testApp } from "./test-app";

let app: TestApp;
beforeAll(async () => {
  app = await testApp();
}, 60_000);
afterEach(() => vi.restoreAllMocks());

it.each([true, false, undefined])(
  "email signup carries public consent %s and approved attribution",
  async (allowed) => {
    const delivered = vi.spyOn(posthog, "trackProductEvent").mockResolvedValue();
    const headers = new Headers();
    if (allowed !== undefined)
      headers.set(
        "cookie",
        `lymi_analytics_consent=${encodeURIComponent(JSON.stringify({ version: 1, allowed, updated_at: Date.now() }))}; lymi_analytics_attribution=${encodeURIComponent(JSON.stringify({ first_landing_page: "/explore/estonian-a1", referrer: "lennysnewsletter.com", utm_source: "lenny", email: "private@example.test" }))}`,
      );
    const auth = createAuth(app.env, app.db);
    const created = await auth.api.signUpEmail({
      headers,
      body: {
        email: `consent-${allowed}@lymi.local`,
        name: "Private learner",
        password: "quiet-harbour-morning",
      },
      asResponse: true,
    });
    expect(created.ok).toBe(true);
    const { user } = (await created.json()) as { user: { id: string } };
    const ctx = { db: app.db, userId: user.id, actor: "user" as const };
    expect((await getSettings(ctx)).analyticsConsent).toBe(allowed ?? null);
    const signup = delivered.mock.calls.find((call) => call[2].name === "signed_up");
    expect(signup?.[1]).toBe(user.id);
    expect(signup?.[2]).toMatchObject({
      name: "signed_up",
      method: "email",
      first_landing_page: allowed === undefined ? "/other" : "/explore/estonian-a1",
    });
    expect(JSON.stringify(signup?.[2])).not.toMatch(/Private learner|private@example/);
    expect(await signup?.[4]?.()).toMatchObject({ allowed: allowed === true });
  },
);
