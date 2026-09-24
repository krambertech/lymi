import { e2eProductPackageUrl } from "./ports.mjs";
import { expect, test } from "./test";

const productionProduct = e2eProductPackageUrl;

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

  // An app left open looks for new code when it comes back to the front, not only on a load.
  await page.evaluate(() => {
    const counted = window as Window & { updateChecks?: number };
    counted.updateChecks = 0;
    const update = ServiceWorkerRegistration.prototype.update;
    ServiceWorkerRegistration.prototype.update = function (this: ServiceWorkerRegistration) {
      counted.updateChecks = (counted.updateChecks ?? 0) + 1;
      return update.call(this);
    };
  });
  // Sent until one lands, because the listener is added once registration settles after the reload.
  await expect
    .poll(() =>
      page.evaluate(() => {
        document.dispatchEvent(new Event("visibilitychange"));
        return (window as Window & { updateChecks?: number }).updateChecks;
      }),
    )
    .toBeGreaterThan(0);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Sign in to Lymi" })).toBeVisible();
});
