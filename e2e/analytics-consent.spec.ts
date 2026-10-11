import { mkdirSync } from "node:fs";
import { e2eSiteUrl } from "./ports.mjs";
import { expect, test } from "./test";

const banner = (page: import("@playwright/test").Page) =>
  page.getByRole("complementary", { name: "Accept cookies" });
test("privacy choice persists across surfaces, can be withdrawn and reports save failures", async ({
  page,
  context,
}, info) => {
  test.setTimeout(120_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("requestfailed", (request) =>
    browserErrors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  await context.clearCookies({ name: "lymi_analytics_consent" });
  const requests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("posthog.com")) requests.push(req.url());
  });
  await page.goto("/api/dev/sign-in?as=learner&reset=1");
  await expect(banner(page), JSON.stringify(browserErrors)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  const shots = process.env.ANALYTICS_SCREENSHOTS;
  if (shots) {
    mkdirSync(shots, { recursive: true });
    await page.screenshot({ path: `${shots}/product-${info.project.name}-banner.png` });
  }
  await banner(page).getByText("Analytics details", { exact: true }).click();
  await expect(banner(page).getByText(/PostHog processes analytics/)).toBeVisible();
  if (shots) {
    await page.screenshot({ path: `${shots}/product-${info.project.name}-details.png` });
    if (info.project.name === "chromium") {
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.screenshot({ path: `${shots}/product-tablet-details.png` });
      await page.setViewportSize({ width: 393, height: 852 });
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await banner(page)
        .getByRole("button", { name: "Decline", exact: true })
        .click({ trial: true });
      await page.screenshot({ path: `${shots}/product-phone-dark-details.png` });
      await page.emulateMedia({ colorScheme: "light" });
      await page.setViewportSize(viewport);
    }
  }
  let releaseSave: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route("**/api/settings/analytics-consent", async (route) => {
    if (route.request().method() === "PUT") await waiting;
    await route.continue();
  });
  await banner(page).getByRole("button", { name: "Accept cookies", exact: true }).click();
  await expect(
    banner(page).getByRole("button", { name: "Accept cookies", exact: true }),
  ).toBeDisabled();
  await expect(banner(page).getByRole("button", { name: "Decline", exact: true })).toBeDisabled();
  if (shots) await page.screenshot({ path: `${shots}/product-${info.project.name}-saving.png` });
  releaseSave();
  await expect(banner(page)).toBeHidden();
  await page.unroute("**/api/settings/analytics-consent");
  expect(await page.request.get("/api/settings").then((r) => r.json())).toMatchObject({
    analyticsConsent: true,
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(banner(page)).toBeHidden();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Privacy preferences", exact: true }).click();
  await expect(banner(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(banner(page)).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Privacy preferences", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Privacy preferences", exact: true }).click();
  await context.setOffline(true);
  await banner(page).getByRole("button", { name: "Decline", exact: true }).click();
  await expect(banner(page).getByRole("alert")).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/product-${info.project.name}-offline.png` });
  expect(
    JSON.parse(
      decodeURIComponent(
        (await context.cookies()).find((c) => c.name === "lymi_analytics_consent")!.value,
      ),
    ).allowed,
  ).toBe(false);
  await context.setOffline(false);
  await banner(page).getByRole("button", { name: "Decline", exact: true }).click();
  await expect(banner(page)).toBeHidden();
  expect(await page.request.get("/api/settings").then((r) => r.json())).toMatchObject({
    analyticsConsent: false,
  });
  await page.goto(e2eSiteUrl);
  await expect(page.getByRole("heading", { name: "Accept cookies" })).toBeHidden();
  await page.getByRole("button", { name: "Privacy preferences", exact: true }).click();
  await expect(banner(page)).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/site-${info.project.name}-details.png` });
  await banner(page).getByRole("button", { name: "Accept cookies", exact: true }).click();
  await expect(banner(page)).toBeHidden();
  expect(await page.request.get("/api/settings").then((r) => r.json())).toMatchObject({
    analyticsConsent: true,
  });
  expect(requests).toEqual([]);
  expect(
    (await context.cookies()).filter((c) =>
      /posthog|lymi_analytics_identity|lymi_analytics_attribution/.test(c.name),
    ),
  ).toEqual([]);
});
test("the Ukrainian mobile banner has reachable controls and names the processor in details", async ({
  page,
  context,
}, info) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("requestfailed", (request) =>
    browserErrors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  await context.clearCookies({ name: "lymi_analytics_consent" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto(`${e2eSiteUrl}/uk/`);
  const region = page.getByRole("complementary", { name: "Прийняти файли cookie" });
  await expect(region).toBeVisible();
  await region.getByText("Про аналітику", { exact: true }).click();
  await expect(region.getByRole("button", { name: "Прийняти файли cookie" })).toBeVisible();
  if (process.env.ANALYTICS_SCREENSHOTS)
    await page.screenshot({
      path: `${process.env.ANALYTICS_SCREENSHOTS}/site-${info.project.name}-uk-mobile.png`,
    });
  await region.getByRole("button", { name: "Відхилити", exact: true }).click();
  await expect(region, JSON.stringify(browserErrors)).toBeHidden();
});
