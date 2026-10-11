import { createAccountThroughDevForm } from "./auth";
import { e2eSiteUrl } from "./ports.mjs";
import { expect, test } from "./test";

const banner = (page: import("@playwright/test").Page) =>
  page.getByRole("complementary", { name: "Accept cookies" });

test("privacy choices live on the public site and synchronize without an app banner", async ({
  page,
  context,
}) => {
  await context.clearCookies({ name: "lymi_analytics_consent" });
  await page.goto("/api/dev/sign-in?as=learner&reset=1");
  await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
  await page.goto("/settings");
  const preferences = page.getByRole("link", { name: "Privacy preferences", exact: true });
  await expect(preferences).toHaveAttribute("href", `${e2eSiteUrl}/privacy#privacy-preferences`);
  await preferences.focus();
  await page.keyboard.press("Enter");
  await expect(banner(page)).toBeFocused();
  await expect(banner(page).getByText(/PostHog processes analytics/)).toBeVisible();
  await banner(page).getByRole("button", { name: "Accept cookies", exact: true }).click();
  await expect(banner(page)).toBeHidden();
  expect(await page.request.get("/api/settings").then((r) => r.json())).toMatchObject({
    analyticsConsent: true,
  });
  await page.goBack();
  await expect(preferences).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
  await preferences.click();
  await expect(banner(page)).toBeVisible();
  await context.setOffline(true);
  await banner(page).getByRole("button", { name: "Decline", exact: true }).click();
  await expect(banner(page).getByRole("alert")).toBeVisible();
  expect(
    JSON.parse(
      decodeURIComponent(
        (await context.cookies()).find((c) => c.name === "lymi_analytics_consent")?.value ?? "null",
      ),
    ).allowed,
  ).toBe(false);
  await context.setOffline(false);
  await banner(page).getByRole("button", { name: "Decline", exact: true }).click();
  await expect(banner(page)).toBeHidden();
  expect(await page.request.get("/api/settings").then((r) => r.json())).toMatchObject({
    analyticsConsent: false,
  });
  await page.goBack();
  await expect(preferences).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

for (const choice of ["accepted", "declined", "untouched"] as const) {
  test(`signup carries a ${choice} public preference without a checkbox`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(120_000);
    await context.clearCookies({ name: "lymi_analytics_consent" });
    if (choice !== "untouched") {
      await page.goto(e2eSiteUrl);
      await banner(page)
        .getByRole("button", {
          name: choice === "accepted" ? "Accept cookies" : "Decline",
          exact: true,
        })
        .click();
      await expect(banner(page)).toBeHidden();
    }
    await page.goto("/login?dev=1");
    await expect(page.getByRole("heading", { name: "Sign in to Lymi", exact: true })).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await createAccountThroughDevForm(
      page,
      `consent-${choice}-${info.project.name}-${Date.now()}@example.test`,
    );
    await expect(page.getByRole("heading", { name: "Welcome to Lymi", exact: true })).toBeVisible();
    await expect(banner(page)).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    expect(await page.request.get("/api/settings").then((r) => r.json())).toMatchObject({
      analyticsConsent: choice === "untouched" ? null : choice === "accepted",
    });
    if (choice === "untouched")
      expect(
        (await context.cookies()).find((c) => c.name === "lymi_analytics_consent"),
      ).toBeUndefined();
    expect(
      (await context.cookies()).filter((c) =>
        /posthog|lymi_analytics_identity|lymi_analytics_attribution/.test(c.name),
      ),
    ).toEqual([]);
  });
}

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
