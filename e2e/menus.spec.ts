import { expect, test } from "./test";

/**
 * A menu on a touch device is a drawer, and a drawer is put away with the thumb. The rest of the
 * menu's behavior is proven per component in `ui/dropdown-menu.browser.test.tsx`; a drag needs a page
 * and a device. The design page renders the real menu without signing in.
 */
test.skip(({ isMobile }) => !isMobile, "The drawer is the touch shape.");

test("a menu rises as a drawer and swipes away", async ({ page }) => {
  await page.goto("/design/components/menu");
  await page.getByRole("button", { name: "Deck options", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Deck options" });
  await expect(drawer.getByRole("menuitem", { name: "Archive", exact: true })).toBeVisible();

  // A drag that starts mid-rise measures from the wrong place, so wait for the rise to finish.
  await drawer.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const box = await drawer.boundingBox();
  if (!box) throw new Error("The drawer has no box.");
  const x = box.x + box.width / 2;
  const y = box.y + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 300, { steps: 10 });
  await page.mouse.up();

  await expect(drawer).toBeHidden();
});
