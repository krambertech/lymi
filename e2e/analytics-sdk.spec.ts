import { resolve } from "node:path";
import { expect, test } from "./test";

const modulePath = `/@fs/${resolve("packages/client/src/analytics.ts")}`;
test("the real browser SDK sends only approved payloads and suppresses capture after withdrawal", async ({
  page,
  context,
}) => {
  // PostHog filters automated browsers; this exercises a normal browser's capture path.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
  });
  const sent: string[] = [];
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await context.route("https://*.posthog.com/**", async (route) => {
    const raw = route.request().postData() ?? "";
    const encoded = new URLSearchParams(raw).get("data");
    sent.push(encoded ? Buffer.from(encoded, "base64").toString("utf8") : raw);
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"status":1}' });
  });
  await page.route("**/analytics-sdk-test?token=private-query-token", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html lang="uk"><head></head><body>Analytics test</body></html>',
    }),
  );
  await page.goto("/analytics-sdk-test?token=private-query-token");
  const accepted = await page.evaluate(async (path) => {
    const analytics = await import(path);
    analytics.setAnalyticsLearner(undefined);
    analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
    analytics.setAnalyticsConsent(true);
    analytics.setAnalyticsLearner("test-opaque-account", true);
    const accepted = analytics.captureAnalytics("welcome_step_viewed", {
      step_name: "goal",
      skipped: false,
      term: "private-card-content",
      email: "private@example.com",
    });
    return { accepted, consent: analytics.analyticsConsent(), cookies: document.cookie };
  }, modulePath);
  expect(accepted, JSON.stringify(browserErrors)).toMatchObject({
    accepted: true,
    consent: { allowed: true },
  });
  await expect.poll(() => sent.join(" ")).toContain("welcome_step_viewed");
  const payload = sent.join(" ");
  expect(payload).toContain("test-opaque-account");
  expect(payload).toContain("ui_locale");
  expect(payload).toContain("uk");
  expect(payload).not.toContain("private-card-content");
  expect(payload).not.toContain("private@example.com");
  expect(payload).not.toContain("private-query-token");
  const cookies = await context.cookies();
  expect(
    cookies
      .filter((c) => !c.name.startsWith("lymi_analytics_"))
      .filter((c) => c.name.includes("ph_") || c.name.includes("posthog")),
  ).toEqual([]);
  await page.evaluate(async (path) => {
    const analytics = await import(path);
    analytics.setAnalyticsConsent(false);
    analytics.captureAnalytics("welcome_step_viewed", { step_name: "start", skipped: true });
  }, modulePath);
  await page.waitForTimeout(3500);
  expect(sent.join(" ")).not.toContain('"step_name":"start"');
  expect(
    (await context.cookies()).filter(
      (c) => c.name === "lymi_analytics_identity" || c.name === "lymi_analytics_attribution",
    ),
  ).toEqual([]);
});
