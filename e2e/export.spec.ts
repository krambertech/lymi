import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

/** Waits for the sheet to offer the file, then checks the download route hands over a zip. */
async function expectDownload(page: Page, fileName: RegExp) {
  const download = page.getByRole("link", { name: "Download", exact: true });
  await expect(download).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(fileName)).toBeVisible();
  const href = await download.getAttribute("href");
  expect(href).toMatch(/^\/api\/exports\/[^/]+\/file$/);
  const response = await page.request.get(href as string);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  const bytes = await response.body();
  // Every zip starts with a local file header.
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
}

test("a learner exports a deck and the library, and finds the files in Activity", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await startAsTestLearner(page, testInfo, "export");

  const deckName = `Export ${testInfo.project.name}`;
  const deck = await page.request.post("/api/decks", {
    data: { name: deckName, defaultLanguage: "it" },
  });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  const cards = await page.request.post("/api/cards/batch", {
    data: {
      cards: [
        { deckId, term: "il gatto", meaning: "the cat", tags: ["animals"] },
        { deckId, term: "la casa", meaning: "the house" },
      ],
    },
  });
  expect(cards.ok()).toBeTruthy();

  await test.step("export the deck as a Lymi file from its menu", async () => {
    await page.goto(`/library/${deckId}`);
    await page
      .getByRole("button", { name: "Deck options", exact: true })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Export", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: `Export ${deckName}`, exact: true });
    await expect(sheet.getByRole("radio", { name: "Spreadsheet" })).toBeVisible();
    await sheet.getByRole("radio", { name: "Lymi file" }).click();
    await sheet.getByRole("button", { name: "Export", exact: true }).click();
    await expectDownload(page, /^export-(chromium|webkit)\.zip$/);
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toBeHidden();
  });

  await test.step("export the whole library as an Anki package from Settings", async () => {
    // A deck's phone top bar has a way back instead of the learner menu, so Settings opens directly.
    await page.goto("/settings");
    await page.getByRole("button", { name: "Export library", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Export your library", exact: true });
    await expect(sheet.getByRole("radio", { name: "Anki package" })).toBeChecked();
    await expect(sheet.getByRole("radio", { name: "Spreadsheet" })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Export", exact: true }).click();
    await expectDownload(page, /^lymi-library-\d{4}-\d{2}-\d{2}\.apkg$/);
  });

  await test.step("both files are listed in Activity with their downloads", async () => {
    await page.goto("/activity");
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await expect(page.getByText(/Exported \d+ cards as a Lymi file/)).toBeVisible();
    await expect(page.getByText(/Exported \d+ cards as an Anki package/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Download export-(chromium|webkit)\.zip$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Download lymi-library-.*\.apkg$/ }),
    ).toBeVisible();
    // Activity is a log, so it carries no import action of its own; Settings holds that.
    await expect(page.getByRole("link", { name: "Import cards", exact: true })).toHaveCount(0);
  });
});
