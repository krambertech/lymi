import { join } from "node:path";
import { signInAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

/** The Mochi fixture made by `fixtures/generate.py`: 13 cards in 3 decks, 12 reviews, 4 pictures; one card has no term. */
const MOCHI_FILE = join(process.cwd(), "apps/web/src/server/imports/mochi/fixtures/export.mochi");

/** The learner menu sits in the rail on a desktop and in the top bar on a phone; the one on screen is it. */
function learnerMenu(page: Page) {
  return page.getByRole("button", { name: "Dev", exact: true }).filter({ visible: true });
}

test("a learner imports a Mochi export and finds it in Activity", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await signInAsTestLearner(page, testInfo, "mochi-import");

  await test.step("open the Mochi import from Settings", async () => {
    await learnerMenu(page).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await page.getByRole("link", { name: /^Mochi\b/ }).click();
    await expect(
      page.getByRole("heading", { name: "Import from Mochi", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Something went wrong? Read the guide", exact: true }),
    ).toHaveAttribute("href", /\/docs\/import-from-mochi$/);
  });

  await test.step("upload the export and check what comes across", async () => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose file", exact: true }).click();
    await (await chooser).setFiles(MOCHI_FILE);
    await expect(page.getByRole("heading", { name: "Does this card look right?" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Cards keep the due dates they had in Mochi.")).toBeVisible();
    await expect(
      page.getByText("1 card has no --- line, so it comes across with a term and no meaning."),
    ).toBeVisible();
  });

  await test.step("confirm every kind of card and import", async () => {
    const yes = page.getByRole("button", { name: "Yes, looks right", exact: true });
    const checked = page.getByText(/^(\d+) of \1 checked$/);
    while (!(await checked.isVisible())) {
      await yes.click();
    }
    await page.getByRole("button", { name: "Import 12 cards", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Imported 12 cards", exact: true })).toBeVisible(
      { timeout: 60_000 },
    );
    await expect(page.getByText("12 past reviews came across.")).toBeVisible();
  });

  await test.step("the decks are in Library and the import is in Activity", async () => {
    await page.getByRole("link", { name: "Open Library", exact: true }).click();
    await expect(
      page.locator("main").getByText("Italian / Lesson 1 / Verbs", { exact: true }),
    ).toBeVisible();
    await page.goto("/activity");
    await expect(
      page.getByRole("link", { name: /Imported \d+ cards from Mochi.*export\.mochi/ }),
    ).toBeVisible();
  });
});
