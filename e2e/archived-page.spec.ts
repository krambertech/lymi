import { signInAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

function notifications(page: Page) {
  return page.getByRole("region", { name: "Notifications" });
}

async function createDeck(page: Page, name: string) {
  const res = await page.request.post("/api/decks", { data: { name, defaultLanguage: "it" } });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function addCard(page: Page, deckId: string, term: string, meaning: string) {
  const res = await page.request.post("/api/cards", { data: { deckId, term, meaning } });
  expect(res.ok()).toBeTruthy();
}

/**
 * Archive is the only removal Lymi has, so the learner must be able to reach what they archived
 * after the Undo toast is gone. Archived is that road back, for a whole deck and for one card.
 */
test("a learner can restore a deck and a card from Archived", async ({ page }, testInfo) => {
  await signInAsTestLearner(page, testInfo, "archived-page");
  const deckName = `Lista vecchia ${testInfo.project.name}`;
  const keptName = `Lezione ${testInfo.project.name}`;
  const term = "il tramonto";

  await test.step("archive a whole deck and lose the toast", async () => {
    const deckId = await createDeck(page, deckName);
    await addCard(page, deckId, "la nebbia", "the fog");
    await page.goto(`/library/${deckId}`);
    await expect(page.getByRole("heading", { level: 1, name: deckName })).toBeVisible();

    await page.getByRole("button", { name: "Deck options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await expect(page).toHaveURL(/\/library$/);
    // The Undo toast is gone by the next step, which is the point: Archived is the only way back.
    await expect(page.getByText(deckName, { exact: true })).toHaveCount(0);
  });

  await test.step("archive one card, leaving its deck active", async () => {
    const keptId = await createDeck(page, keptName);
    await addCard(page, keptId, term, "the sunset");
    await page.goto(`/library/${keptId}`);
    await page.getByRole("button").filter({ hasText: term }).first().click();

    await page.getByRole("button", { name: "Card options", exact: true }).first().click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await expect(page.getByText(term, { exact: true })).toHaveCount(0);
  });

  await test.step("find both on Archived, under their own headings", async () => {
    await page.goto("/archived");
    await expect(page.getByRole("heading", { level: 1, name: "Archived" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Decks" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Cards" })).toBeVisible();
    await expect(page.getByText(deckName, { exact: true })).toBeVisible();
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    // The active deck's other card was never archived on its own, so it is not listed.
    await expect(page.getByText("la nebbia", { exact: true })).toHaveCount(0);
  });

  await test.step("restore the deck and find it back in Library with its cards", async () => {
    await page.getByRole("button", { name: `Restore ${deckName}`, exact: true }).click();
    await expect(notifications(page)).toContainText(`Restored “${deckName}”`);
    await expect(page.getByRole("heading", { level: 2, name: "Decks" })).toHaveCount(0);

    await page.goto("/library");
    const deck = page
      .locator("main")
      .getByRole("link")
      .filter({ has: page.getByText(deckName, { exact: true }) });
    await expect(deck).toBeVisible();
    await deck.click();
    await expect(page.getByText("la nebbia", { exact: true })).toBeVisible();
  });

  await test.step("restore the card and find it back in its deck, after a reload", async () => {
    await page.goto("/archived");
    await page.getByRole("button", { name: `Restore ${term}`, exact: true }).click();
    await expect(notifications(page)).toContainText(`Restored “${term}”`);

    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Nothing archived" })).toBeVisible();

    await page.goto("/library");
    await page
      .locator("main")
      .getByRole("link")
      .filter({ has: page.getByText(keptName, { exact: true }) })
      .click();
    await expect(page.getByText(term, { exact: true })).toBeVisible();
  });
});
