import { createAccountThroughDevForm } from "./auth";
import { e2eSiteUrl } from "./ports.mjs";
import { expect, test } from "./test";

const analyticsCookies = (cookies: { name: string }[]) =>
  cookies.filter((c) => /ph_|posthog|lymi_analytics/.test(c.name));

test("the public site asks nothing and stores nothing for analytics", async ({ page, context }) => {
  for (const path of ["/", "/uk"]) {
    await page.goto(`${e2eSiteUrl}${path}`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /cookie/i })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: /privacy/i })).toHaveCount(0);
  }
  expect(analyticsCookies(await context.cookies())).toEqual([]);
  const stored = await page.evaluate(() => [
    ...Object.keys(localStorage),
    ...Object.keys(sessionStorage),
  ]);
  expect(stored.filter((key) => /ph_|posthog|analytics|consent/i.test(key))).toEqual([]);
});

test("a learner's analytics are on with no switch in Settings", async ({ page }) => {
  await page.goto("/api/dev/sign-in?as=learner&reset=1");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  expect(await page.request.get("/api/settings").then((r) => r.json())).toMatchObject({
    analyticsConsent: null,
  });
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("switch", { name: /analytics/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /privacy preferences/i })).toHaveCount(0);
});

test("a public visit's source rides the Get started link into sign-up without cookies", async ({
  page,
  context,
}, info) => {
  test.setTimeout(120_000);
  await page.goto(`${e2eSiteUrl}/teachers?utm_source=e2e-newsletter`);
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  const arrived = new URL(page.url());
  expect(arrived.searchParams.get("lp")).toBe("/teachers");
  expect(arrived.searchParams.get("utm_source")).toBe("e2e-newsletter");
  arrived.searchParams.set("dev", "1");
  await page.goto(arrived.toString());
  const signUp = page.waitForRequest((r) => r.url().endsWith("/api/auth/sign-up/email"));
  await createAccountThroughDevForm(
    page,
    `first-touch-${info.project.name}-${Date.now()}@example.test`,
  );
  expect(JSON.parse((await signUp).headers()["x-lymi-first-touch"] ?? "null")).toEqual({
    first_landing_page: "/teachers",
    utm_source: "e2e-newsletter",
  });
  expect(analyticsCookies(await context.cookies())).toEqual([]);
});
