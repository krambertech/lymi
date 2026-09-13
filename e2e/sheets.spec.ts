import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * A form sheet on a touch device is a drawer, put away with the thumb. The rest of its behavior is
 * proven per component in `ui/dialog.browser.test.tsx`; a drag needs a page and a device.
 */
test.skip(({ isMobile }) => !isMobile, "The drawer is the touch shape.");

async function dragGrabber(page: Page, drawer: Locator, distance: number) {
  // A drag that starts mid-rise measures from the wrong place, so wait for the rise to finish.
  await drawer.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = await drawer.boundingBox();
  if (!box) throw new Error("The drawer has no box.");
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + distance, { steps: 10 });
  await page.mouse.up();
}

test("a sheet swipes away, and a short drag springs back", async ({ page }) => {
  await page.goto("/design/components/overlays");
  await page.getByRole("button", { name: "Open sheet", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "New deck" });
  await expect(sheet).toBeVisible();

  await dragGrabber(page, sheet, 24);
  await expect(sheet).toBeInViewport({ ratio: 1 });

  await dragGrabber(page, sheet, 400);
  await expect(sheet).toBeHidden();
});
