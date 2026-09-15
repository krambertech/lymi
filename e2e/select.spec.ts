import { expect, test } from "./test";

/**
 * A select on a touch device is a drawer, and a drawer is put away with the thumb. The rest of the
 * select's behavior is proven per component in `ui/select.browser.test.tsx`; a drag needs a page and
 * a device. The design page renders the real select without signing in.
 */
test.skip(({ isMobile }) => !isMobile, "The drawer is the touch shape.");

test("a select rises as a drawer, takes a choice, and swipes away", async ({ page }) => {
  await page.goto("/design/components/select");
  const box = page.getByRole("combobox", { name: "Deck", exact: true }).first();
  await expect(box).toHaveText("Lesson 14");

  await box.click();
  const drawer = page.getByRole("dialog", { name: "Deck" });
  await expect(drawer.getByRole("option", { name: "Lesson 14" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await drawer.getByRole("option", { name: "Portuguese" }).click();
  await expect(drawer).toBeHidden();
  await expect(box).toHaveText("Portuguese");

  await box.click();
  await expect(drawer.getByRole("option", { name: "Portuguese" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  // A drag that starts mid-rise measures from the wrong place, so wait for the rise to finish.
  await drawer.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const rect = await drawer.boundingBox();
  if (!rect) throw new Error("The drawer has no box.");
  const x = rect.x + rect.width / 2;
  const y = rect.y + 8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 300, { steps: 10 });
  await page.mouse.up();

  await expect(drawer).toBeHidden();
  await expect(box).toHaveText("Portuguese");
});
