import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

/** The account's first review teaches itself, then ends on a plan. docs/design/onboarding.md. */

async function seedDeck(page: Page, terms: number) {
  const deck = await page.request.post("/api/decks", {
    data: { name: "First", defaultLanguage: "it" },
  });
  expect(deck.ok()).toBeTruthy();
  const { id } = (await deck.json()) as { id: string };
  const cards = await page.request.post("/api/cards/batch", {
    data: {
      cards: Array.from({ length: terms }, (_, i) => ({
        deckId: id,
        term: `parola ${i}`,
        meaning: `word ${i}`,
      })),
    },
  });
  expect(cards.ok()).toBeTruthy();
}

async function grade(page: Page) {
  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  await page.getByRole("button", { name: /^Good/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("lymi-no-first-review"));
});

test("the first review teaches, ends on the plan, and an ordinary end follows", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await startAsTestLearner(page, testInfo, "first-review", "/today");
  await seedDeck(page, 1);
  await page.goto("/review");

  await expect(page.getByText("Try to remember what this means.")).toBeVisible();
  await grade(page);
  // The only card is done, and the timeline still holds the end until the learner moves on.
  await expect(page.getByRole("heading", { name: /comes back/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /first review/ })).toBeHidden();
  await page.getByRole("button", { name: "Next card" }).click();

  await expect(page.getByRole("heading", { name: "You finished your first review" })).toBeVisible();
  await expect(page.getByText("You started your streak")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "How much time a day?" })).toBeVisible();
  await page.getByRole("radio", { name: /15 minutes/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // The test browser has no web push to offer, so the ask steps aside.
  await expect(page.getByRole("heading", { name: /^See you/ })).toBeVisible();
  await expect(page.getByText("15 minutes a day")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add more cards" })).toBeVisible();
  await page.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/today/);
  const settings = await page.request.get("/api/settings");
  expect(((await settings.json()) as { dailyGoal: number }).dailyGoal).toBe(50);
});

test("closing early still ends on the success screen, and X leaves from it", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await startAsTestLearner(page, testInfo, "first-review-early", "/today");
  await seedDeck(page, 4);
  await page.goto("/review");

  await grade(page);
  await page.getByRole("button", { name: "Next card" }).click();
  await page.getByRole("button", { name: "Leave review" }).click();
  await expect(page.getByRole("heading", { name: "That’s your first review" })).toBeVisible();
  await expect(page.getByText(/more to start your streak/)).toBeVisible();
  await page.getByRole("button", { name: "Leave review" }).click();
  await expect(page).toHaveURL(/\/today/);
});
