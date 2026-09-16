import { signInAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

async function createDeck(page: Page, name: string): Promise<string> {
  const res = await page.request.post("/api/decks", {
    data: { name, defaultLanguage: "it" },
  });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { id: string }).id;
}

/**
 * A word opens from its deck over the page or beside the list: read first, edited in the card form on request, with
 * its history underneath and its actions in one menu. This walks that life once: open, edit
 * a field and see the source become the learner's, move it to another deck, and archive it.
 */
test("a word opens, edits, moves and archives from its deck", async ({ page }, testInfo) => {
  await signInAsTestLearner(page, testInfo, "word-detail");
  // The list under the word repeats the meaning, so checks are scoped to the visible article.
  const word = page.locator("article").filter({ visible: true });
  const shown = (text: string) => word.getByText(text, { exact: true });
  const first = await createDeck(page, "Word detail first");
  const second = await createDeck(page, "Word detail second");
  const term = "sbrigarsi";

  await test.step("add a word whose meaning the AI wrote", async () => {
    const res = await page.request.post("/api/cards", {
      data: { deckId: first, term, meaning: "to hurry", meaningSource: "ai", language: "it" },
    });
    expect(res.ok()).toBeTruthy();
  });

  await test.step("open it from the list", async () => {
    await page.goto(`/library/${first}`);
    await page
      .getByRole("button")
      .filter({ has: page.getByText(term, { exact: true }) })
      .click();
    await expect(page).toHaveURL(/\?card=/);
    await expect(page.getByRole("heading", { level: 1, name: term })).toBeVisible();
    // The badge is the mark and one word; the whole sentence stays for a screen reader.
    await expect(shown("AI")).toBeVisible();
    await expect(shown("AI meaning")).toBeAttached();
    await expect(shown("Card added")).toBeVisible();
  });

  await test.step("edit the meaning and watch the source become yours", async () => {
    await word.getByRole("button", { name: "Edit card", exact: true }).click();
    const sheet = page.locator('[role="dialog"], dialog').filter({
      has: page.getByRole("heading", { name: "Edit card", exact: true }),
    });
    await expect(sheet).toBeVisible();
    const meaning = sheet.getByRole("textbox", { name: "Meaning", exact: true });
    await expect(meaning).toHaveValue("to hurry");
    await meaning.fill("to hurry up, to get a move on");
    // Closed by mistake, the edit comes back with Undo.
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await page
      .getByRole("region", { name: "Notifications" })
      .getByRole("button", { name: "Undo", exact: true })
      .click();
    await expect(meaning).toHaveValue("to hurry up, to get a move on");
    await sheet.getByRole("button", { name: "Save", exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(shown("to hurry up, to get a move on")).toBeVisible();
    await expect(shown("You")).toBeVisible();
    await expect(shown("Meaning by you")).toBeAttached();
    await expect(shown("Meaning changed to “to hurry up, to get a move on”")).toBeVisible();
  });

  await test.step("move it to the other deck", async () => {
    await page.getByRole("button", { name: "Card options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Move to…", exact: true }).click();
    const sheet = page.locator('[role="dialog"], dialog').filter({
      has: page.getByRole("heading", { name: /^Move/ }),
    });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Word detail second", exact: true }).click();
    await expect(page).not.toHaveURL(/\?card=/);
    await expect(page.getByText(term, { exact: true })).toHaveCount(0);

    await page.goto(`/library/${second}`);
    await expect(page.getByText(term, { exact: true })).toBeVisible();
  });

  await test.step("archive it from the menu, with Undo on offer", async () => {
    await page
      .getByRole("button")
      .filter({ has: page.getByText(term, { exact: true }) })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: term })).toBeVisible();
    await page.getByRole("button", { name: "Card options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("region", { name: "Notifications" })).toContainText(
      `Archived “${term}”`,
    );
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: term })).toHaveCount(0);
  });
});
