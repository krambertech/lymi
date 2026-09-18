import { startAsTestLearner } from "./auth";
import { expect, test } from "./test";

/**
 * Activity is what keeps an integration honest: a key writes, and the learner sees what landed,
 * whose it was, and the cards themselves, without leaving the screen. docs/design/activity.md.
 */
test("a key's cards land on Activity, open there and archive from the word", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "activity");
  let key = "";
  let deckId = "";

  await test.step("a key writes two cards into a deck", async () => {
    const made = await page.request.post("/api/keys", {
      data: { name: "Lesson notes script", scope: "write" },
    });
    expect(made.ok()).toBeTruthy();
    key = ((await made.json()) as { key: string }).key;

    const deck = await page.request.post("/api/decks", {
      data: { name: "Activity deck", defaultLanguage: "it" },
    });
    expect(deck.ok()).toBeTruthy();
    deckId = ((await deck.json()) as { id: string }).id;

    for (const term of ["sbrigarsi", "affrettarsi"]) {
      const card = await page.request.post("/api/cards", {
        headers: { "x-api-key": key },
        data: { deckId, term, meaning: "to hurry", language: "it" },
      });
      expect(card.ok()).toBeTruthy();
    }
    const section = await page.request.post(`/api/decks/${deckId}/sections`, {
      headers: { "x-api-key": key },
      data: { name: "Lesson 1" },
    });
    expect(section.ok()).toBeTruthy();
  });

  const row = page.getByRole("button", { name: /Added 2 cards to Activity deck/ });

  await test.step("one row says what the key did today, and every row names the key", async () => {
    await page.goto("/activity");
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await expect(row).toContainText("Lesson notes script");
    await expect(row).toHaveAttribute("aria-expanded", "false");
    // A section is not a card, and its row must still say which key made it.
    await expect(
      page.getByRole("listitem").filter({ hasText: /Made the section Lesson 1 in Activity deck/ }),
    ).toContainText("Lesson notes script");
  });

  await test.step("the keyboard opens the row and the cards it wrote", async () => {
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: /sbrigarsi/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /affrettarsi/ })).toBeVisible();
  });

  await test.step("a card opens as the word in its deck, and archiving it shows on the row", async () => {
    await page.getByRole("link", { name: /sbrigarsi/ }).click();
    await expect(page).toHaveURL(new RegExp(`/library/${deckId}\\?card=`));
    await expect(page.getByRole("heading", { level: 1, name: "sbrigarsi" })).toBeVisible();

    const archived = await page.request.post(`/api/cards/${await cardId(page)}/archive`);
    expect(archived.ok()).toBeTruthy();
    await page.goto("/activity");
    await row.click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "sbrigarsi" }).getByText("Archived"),
    ).toBeVisible();
  });
});

/** The open word's id, which the deck page keeps in the address. */
async function cardId(page: { url: () => string }): Promise<string> {
  return new URL(page.url()).searchParams.get("card") ?? "";
}
