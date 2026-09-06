import { expect, test } from "@playwright/test";

const productionProduct = "http://localhost:4175";

test("the production product package installs its shell and starts offline", async ({
  browserName,
  context,
  page,
}) => {
  test.skip(browserName !== "chromium", "Chromium provides the installable-PWA contract");

  await page.goto(`${productionProduct}/login`);
  await expect(page.getByRole("heading", { name: "Sign in to Lymi" })).toBeVisible();
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(`${productionProduct}/`);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Sign in to Lymi" })).toBeVisible();
});
