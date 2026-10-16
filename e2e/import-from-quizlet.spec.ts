import { readFileSync } from "node:fs";
import { join } from "node:path";
import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

const FIXTURES = join(process.cwd(), "packages/core/src/fixtures/quizlet");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8");
/** Set to a folder to keep screenshots of each screen, for a review. */
const SHOTS = process.env.LYMI_SHOT_DIR;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

function learnerMenu(page: Page) {
  return page.getByTestId("learner-menu").filter({ visible: true });
}

test("a learner pastes a Quizlet set and finds it in Library", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await startAsTestLearner(page, testInfo, "quizlet-import", "/today");

  await test.step("open the Quizlet import from Settings", async () => {
    await learnerMenu(page).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    const link = page.getByRole("link", { name: /^Quizlet\b/ });
    await link.scrollIntoViewIfNeeded();
    await shot(page, "shot-after-entry-point");
    await link.click();
    await expect(
      page.getByRole("heading", { name: "Import from Quizlet", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Stuck? Read the guide", exact: true }),
    ).toHaveAttribute("href", /\/docs\/import-from-quizlet$/);
  });

  await test.step("paste, check the preview and the skipped rows", async () => {
    await page.getByLabel("Your set’s text").fill(fixture("05-edge-cases.txt"));
    await expect(page.getByRole("heading", { name: "203 cards", exact: true })).toBeVisible();
    await expect(page.getByText("2 rows have only one side, so they’re skipped.")).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(5);
    await expect(page.getByText("and 198 more cards")).toBeVisible();
    await shot(page, "shot-after-paste-preview");
  });

  await test.step("custom separators read a multiline set", async () => {
    await page.getByLabel("Your set’s text").fill(fixture("03-custom-separators-multiline.txt"));
    await expect(page.getByRole("heading", { name: "3 cards", exact: true })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toContainText("Tallinn");
    await shot(page, "shot-after-custom-separators");
  });

  await test.step("import fixture 01 into a new deck named after the set", async () => {
    await page.getByLabel("Your set’s text").fill(fixture("01-default-tab-newline.txt"));
    await expect(page.getByRole("heading", { name: "5 cards", exact: true })).toBeVisible();
    await page.getByLabel("Set name").fill("German basics");
    await page.getByRole("button", { name: "Continue with 5 cards", exact: true }).click();
    const looksRight = page.getByRole("button", { name: "Looks right", exact: true });
    const ready = page.getByRole("heading", { name: "Ready to import 5 cards" });
    await expect(looksRight.or(ready)).toBeVisible({ timeout: 30_000 });
    while (await looksRight.isVisible()) {
      await looksRight.click();
      await expect(looksRight.or(ready)).toBeVisible();
    }
    await shot(page, "shot-after-ready");
    await page.getByRole("button", { name: "Import 5 cards", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Imported 5 cards", exact: true })).toBeVisible({
      timeout: 60_000,
    });
    await shot(page, "shot-after-result");
  });

  await test.step("the deck holds the cards, term on the front", async () => {
    await page.getByRole("link", { name: "Open Library", exact: true }).click();
    await page.locator("main").getByText("German basics", { exact: true }).click();
    await expect(page.locator("main").getByText("der Hund", { exact: true })).toBeVisible();
  });
});
