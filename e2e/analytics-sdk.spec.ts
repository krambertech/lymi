import { resolve } from "node:path";
import { expect, test } from "./test";

const modulePath = `/@fs/${resolve("packages/client/src/analytics.ts")}`;
test("the real browser SDK sends only approved payloads through the proxy, without cookies, and stops on opt-out", async ({
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
  // Stopped in the browser, so the Worker's proxy never forwards to the real project.
  await context.route("**/ingest/**", async (route) => {
    const raw = route.request().postData() ?? "";
    const encoded = new URLSearchParams(raw).get("data");
    sent.push(encoded ? Buffer.from(encoded, "base64").toString("utf8") : raw);
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"status":1}' });
  });
  const direct: string[] = [];
  await context.route("https://*.posthog.com/**", async (route) => {
    direct.push(route.request().url());
    await route.abort();
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
    analytics.initAnalytics({ token: "phc_test", surface: "product", enabled: true });
    analytics.setAnalyticsLearner("test-opaque-account", true);
    return analytics.captureAnalytics("welcome_step_viewed", {
      step_name: "goal",
      skipped: false,
      term: "private-card-content",
      email: "private@example.com",
    });
  }, modulePath);
  expect(accepted, JSON.stringify(browserErrors)).toBe(true);
  await expect.poll(() => sent.join(" ")).toContain("welcome_step_viewed");
  const payload = sent.join(" ");
  expect(payload).toContain("test-opaque-account");
  expect(payload).toContain("ui_locale");
  expect(payload).toContain("uk");
  expect(payload).not.toContain("private-card-content");
  expect(payload).not.toContain("private@example.com");
  expect(payload).not.toContain("private-query-token");
  expect(direct).toEqual([]);
  expect((await context.cookies()).filter((c) => /ph_|posthog|analytics/.test(c.name))).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.evaluate(async (path) => {
    const analytics = await import(path);
    analytics.setAnalyticsLearner("test-opaque-account", false);
    analytics.captureAnalytics("welcome_step_viewed", { step_name: "start", skipped: true });
  }, modulePath);
  await page.waitForTimeout(3500);
  expect(sent.join(" ")).not.toContain('"step_name":"start"');
});
