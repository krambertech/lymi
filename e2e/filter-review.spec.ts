import { startAsTestLearner } from "./auth";
import { expect, test } from "./test";

const DAY = 86_400_000;

/**
 * A filtered deck page reviews the started cards it shows from a row on Today's plate, due ones
 * first and the rest ahead of time, as a round of its own.
 */
test("a learner reviews the started cards a tag shows", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "filter-review", "/today");
  const deck = await page.request.post("/api/decks", {
    data: { name: "Casa", defaultLanguage: "it" },
  });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  const added = await page.request.post("/api/cards/batch", {
    data: {
      cards: [
        { deckId, term: "la bolletta", meaning: "the utility bill", tags: ["food"] },
        { deckId, term: "il cassetto", meaning: "the drawer", tags: ["food"] },
        { deckId, term: "il treno", meaning: "the train" },
        { deckId, term: "il pane", meaning: "the bread", tags: ["food"] },
      ],
    },
  });
  expect(added.ok()).toBeTruthy();
  const ids = Object.fromEntries(
    ((await added.json()) as { results: { card: { id: string; term: string } }[] }).results.map(
      (r) => [r.card.term, r.card.id],
    ),
  );
  // Forgot three days ago leaves the bill due; Easy yesterday puts the drawer ahead; the bread stays new.
  for (const [term, rating, daysAgo] of [
    ["la bolletta", 1, 3],
    ["il cassetto", 4, 1],
    ["il treno", 1, 3],
  ] as const) {
    const res = await page.request.post("/api/review/grade", {
      data: {
        cardId: ids[term],
        direction: "recognition",
        rating,
        reviewedAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
        timezone: "UTC",
      },
    });
    expect(res.ok()).toBeTruthy();
  }

  await test.step("the line under the filters counts the started cards and how many are due", async () => {
    await page.goto(`/library/${deckId}`);
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "food 3", exact: true }).click();
    await page.keyboard.press("Escape");

    await expect(page.getByText("3 cards", { exact: true })).toBeVisible();
    await expect(page.getByText("1 due today", { exact: true })).toBeVisible();
  });

  await test.step("Review all takes them once each, due first, and ends as a round", async () => {
    await page.getByRole("button", { name: "Review all", exact: true }).click();
    await expect(page).toHaveURL(/\/review\?deck=.*filter=/);
    for (const term of ["la bolletta", "il cassetto"]) {
      await expect(page.getByLabel(/ card for /)).toHaveAttribute("aria-label", new RegExp(term));
      await page
        .getByRole("button", { name: "Reveal the card" })
        .click({ position: { x: 24, y: 24 } });
      await page.getByRole("button", { name: /^Good/ }).click();
    }
    await expect(page.getByRole("heading", { level: 2, name: "Round done" })).toBeVisible();
  });
});
