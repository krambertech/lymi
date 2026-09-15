import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

/** A real export from Anki 26.09, made by `fixtures/generate.py`: 10 cards, 3 decks, 11 reviews. */
const ANKI_FILE = join(process.cwd(), "apps/web/src/server/imports/anki/fixtures/current.apkg");

/** Capture lives in the rail on a desktop and in the top bar on a phone; the one on screen is it. */
function addMenu(page: Page) {
  return page.getByRole("button", { name: "Add", exact: true }).filter({ visible: true });
}

async function chooseFile(page: Page) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose file", exact: true }).click();
  await (await chooser).setFiles(ANKI_FILE);
}

/** Every kind of card in the file has to be confirmed before Import runs. */
async function confirmEveryCard(page: Page) {
  const yes = page.getByRole("button", { name: "Yes, looks right", exact: true });
  const checked = page.getByText(/^(\d+) of \1 checked$/);
  while (!(await checked.isVisible())) {
    await yes.click();
  }
}

test("a learner imports an Anki file, sees it in Activity, undoes it and imports it again", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await signInAsTestLearner(page, testInfo, "anki-import");

  await test.step("open the import from the plus", async () => {
    await addMenu(page).click();
    await page.getByRole("menuitem", { name: "Import from Anki", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Import from Anki", exact: true }),
    ).toBeVisible();
  });

  await test.step("upload the file and check one of the learner's own cards", async () => {
    await chooseFile(page);
    await expect(page.getByRole("heading", { name: "Does this card look right?" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("il gatto", { exact: true })).toBeVisible();
    await expect(page.getByText("Cards keep the due dates they had in Anki.")).toBeVisible();
    await expect(
      page.getByText("1 sound is left out. Lymi says words out loud itself."),
    ).toBeVisible();
    await expect(page.getByText("Italian and Japanese", { exact: true })).toBeVisible();
  });

  await test.step("importing waits until every kind of card is confirmed", async () => {
    const importButton = page.getByRole("button", { name: "Import 10 cards", exact: true });
    await importButton.click();
    await expect(page.getByText("Check each kind of card first. 4 still to check.")).toBeVisible();
    await confirmEveryCard(page);
    await importButton.click();
    await expect(page.getByRole("heading", { name: "Imported 10 cards", exact: true })).toBeVisible(
      {
        timeout: 60_000,
      },
    );
    await expect(page.getByText("11 past reviews came across.")).toBeVisible();
    await expect(page.getByText("2 pictures came across.")).toBeVisible();
  });

  await test.step("the decks are in Library and the import is in Activity", async () => {
    await page.getByRole("link", { name: "Open Library", exact: true }).click();
    await expect(
      page.locator("main").getByText("Italian / Lesson 1", { exact: true }),
    ).toBeVisible();
    await page.goto("/activity");
    await expect(page.getByRole("heading", { name: "Imports", exact: true })).toBeVisible();
    await page.getByRole("link", { name: /current\.apkg/ }).click();
    await expect(
      page.getByRole("heading", { name: "Imported 10 cards", exact: true }),
    ).toBeVisible();
  });

  await test.step("archiving hides the decks it made, and restoring brings them back", async () => {
    await page.getByRole("button", { name: "Archive import", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "This import is archived", exact: true }),
    ).toBeVisible();
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "No decks yet", exact: true })).toBeVisible();
    await page.goBack();
    await page.getByRole("button", { name: "Restore import", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Imported 10 cards", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Imported 10 cards", exact: true }),
    ).toBeVisible();
  });

  await test.step("the same file again adds nothing twice", async () => {
    await page.goto("/import");
    await chooseFile(page);
    await expect(
      page.getByText(
        "10 cards came across in an earlier import. They aren’t added again; only their empty fields are filled.",
      ),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Update 10 cards", exact: true })).toBeVisible();
  });
});
