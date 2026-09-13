import { expect, test } from "@playwright/test";

/**
 * A menu on a touch device is a drawer, and a drawer is put away with the thumb. The rest of the
 * menu's behavior is proven per component in `ResponsiveMenu.browser.test.tsx`; a drag needs a page
 * and a device. The design page renders the real menu without signing in.
 */
test.skip(({ isMobile }) => !isMobile, "The drawer is the touch shape.");

test("a menu rises as a drawer and swipes away", async ({ page }) => {
  await page.goto("/design/components/menu");
  await page.getByRole("button", { name: "Deck options", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Deck options" });
  await expect(drawer.getByRole("menuitem", { name: "Archive deck" })).toBeVisible();

  // The drawer rises for 450 ms; a drag that starts mid-rise measures from the wrong place.
  await expect(drawer).toBeInViewport({ ratio: 1 });
  await page.waitForTimeout(500);
  const box = await drawer.boundingBox();
  if (!box) throw new Error("The drawer has no box.");
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step++) {
    await page.mouse.move(x, y + step * 30);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();

  await expect(drawer).toBeHidden();
});
