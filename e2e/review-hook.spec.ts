import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

// A journey because a peek is held by the page and sent with the grade: it has to survive the
// grade outbox and a reload, and reach D1 with the review. The rules are route and service tests.

type History = { reviews: { rating: number; aid: string | null }[] };

/** A deck of its own holding one new card, due now, with a hook or without one. */
async function cardWithHook(page: Page, term: string, hook: string | null) {
  const deck = await page.request.post("/api/decks", {
    data: { name: `Hooks ${term}`, defaultLanguage: "et" },
  });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  const added = await page.request.post("/api/cards", {
    data: { deckId, term, meaning: "snow", enrich: false, ...(hook ? { hook } : {}) },
  });
  expect(added.ok()).toBeTruthy();
  const cardId = ((await added.json()) as { card: { id: string } }).card.id;
  return { deckId, cardId };
}

const history = async (page: Page, cardId: string) =>
  (await (await page.request.get(`/api/cards/${cardId}/history`)).json()) as History;

test("a learner peeks at a hook, Easy is out, and the peek stays on the grade through the outbox and a reload", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-hook");
  const { deckId, cardId } = await cardWithHook(
    page,
    "lumi",
    "Fresh snow makes the street luminous.",
  );
  await page.goto(`/review?deck=${deckId}`);

  const card = page.getByLabel("Recognition card for lumi", { exact: true });
  const grades = page.getByRole("group", { name: "Choose a recall grade" });
  await test.step("the peek shows the hook without turning the card", async () => {
    await card.getByRole("button", { name: /Peek at your hook/ }).click();
    await expect(
      card.getByRole("paragraph").filter({ hasText: "Fresh snow makes the street luminous." }),
    ).toBeVisible();
    await expect(card.getByRole("status")).toHaveText(
      "Memory hook: Fresh snow makes the street luminous.",
    );
    await expect(grades).toBeHidden();
    await expect(card.getByRole("button", { name: /Peek at your hook/ })).toBeHidden();
  });

  await test.step("after the reveal Easy stays in its slot and does nothing, by click or key", async () => {
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    const easy = grades.getByRole("button", { name: "Easy" });
    await expect(easy).toHaveAttribute("aria-disabled", "true");
    await expect(easy).toHaveAccessibleDescription("Not after a peek");
    await easy.click({ force: true });
    await page.keyboard.press("4");
    await expect(grades).toBeVisible();
    expect((await history(page, cardId)).reviews).toEqual([]);
  });

  await test.step("Good is queued with the peek while grades cannot reach Lymi", async () => {
    await page.route("**/api/review/grade", (route) => route.abort("internetdisconnected"));
    await grades.getByRole("button", { name: /^Good/ }).click();
    await expect(grades).toBeHidden();
  });

  await test.step("a reload sends it, and the review keeps the peek", async () => {
    await page.unroute("**/api/review/grade");
    const sent = page.waitForRequest((r) => r.url().endsWith("/api/review/grade"));
    await page.reload();
    expect((await sent).postDataJSON()).toMatchObject({ cardId, rating: 3, aid: "hook" });
    await expect
      .poll(async () => (await history(page, cardId)).reviews)
      .toEqual([expect.objectContaining({ rating: 3, aid: "hook" })]);
  });
});

test("Undo takes a peeked grade back with its peek", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-hook");
  const { deckId, cardId } = await cardWithHook(page, "sula", "Thaw sounds like a sulk.");
  await page.goto(`/review?deck=${deckId}`);
  await page.getByRole("button", { name: /Peek at your hook/ }).click();
  await page.keyboard.press("Space");
  const graded = page.waitForResponse((r) => r.url().endsWith("/api/review/grade"));
  await page.keyboard.press("3");
  const { reviewId } = (await (await graded).json()) as { reviewId: string };

  // The app has no review Undo yet; the API's is the one that takes a grade back.
  const undone = await page.request.post("/api/review/undo", { data: { reviewId } });
  expect(undone.ok()).toBeTruthy();
  // Today's attempts leave it; the log holds every scope's, so it is read for this card.
  const draw = await page.request.get(`/api/review/draw?deck=${deckId}&tz=UTC`);
  const { log } = (await draw.json()) as { log: { cardId: string }[] };
  expect(log.filter((entry) => entry.cardId === cardId)).toEqual([]);
  expect((await history(page, cardId)).reviews).toMatchObject([{ rating: 3, aid: "hook" }]);
});

test("a card without a hook has no peek control", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-hook");
  const { deckId } = await cardWithHook(page, "jää", null);
  await page.goto(`/review?deck=${deckId}`);
  await expect(page.getByRole("button", { name: "Reveal the card" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Peek at your hook/ })).toHaveCount(0);
});

test("a learner keeps a drafted hook, can undo it, and writes their own from the menu", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-hook");
  const seeded = await page.request.post("/api/dev/fixes", {
    data: { causes: ["no_anchor", "unclear"] },
  });
  expect(seeded.ok()).toBeTruthy();
  const { deckId } = (await seeded.json()) as { deckId: string };
  await page.goto(`/review?deck=${deckId}`);
  const reveal = () =>
    page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  const good = () => page.getByRole("button", { name: /^Good/ }).click();

  // The two cards come in the draw's order, so each step finds its own.
  for (let seen = 0; seen < 2; seen++) {
    await reveal();
    const drafted = page.getByRole("button", { name: /Nothing to hang this one on/ });
    const unclear = page.getByRole("button", { name: /This one keeps slipping/ });
    await expect(drafted.or(unclear)).toBeVisible();

    if (await drafted.isVisible()) {
      await test.step("the drafted hook is kept as the AI's, and Undo takes it off", async () => {
        await drafted.click();
        const sheet = page.getByRole("dialog", { name: "A memory hook for kõrvits" });
        await expect(sheet.getByRole("textbox", { name: "Memory hook" })).toHaveValue(
          "A pumpkin curves at its sides: “curve-its”.",
        );
        await sheet.getByRole("button", { name: "Keep hook" }).click();
        await expect(sheet).toBeHidden();
        // The menu's hook may have left its own toast, so this one is the newest.
        await expect(page.getByText("Hook added").last()).toBeVisible();
        const answer = page.getByLabel("Production card for pumpkin", { exact: true });
        await expect(answer.getByText("AI hook")).toBeVisible();
        await page.getByRole("button", { name: "Undo", exact: true }).last().click();
        await expect(answer.getByText(/curve-its/)).toBeHidden();
      });
    } else {
      await test.step("with no clear reason, the menu writes the learner's own hook", async () => {
        await unclear.click();
        const sheet = page.getByRole("dialog", { name: "Ask it another way" });
        await sheet.getByRole("button", { name: /Add a memory hook/ }).click();
        const written = page.getByRole("dialog", { name: "A memory hook for vaatama" });
        const field = written.getByRole("textbox", { name: "Memory hook" });
        await expect(field).toHaveValue("");
        await field.fill("Watch the vat boil");
        await written.getByRole("button", { name: "Keep hook" }).click();
        await expect(written).toBeHidden();
        const answer = page.getByLabel("Production card for to look, to watch", { exact: true });
        await expect(answer.getByText("Watch the vat boil")).toBeVisible();
        await expect(answer.getByText("AI hook")).toBeHidden();
      });
    }
    await good();
  }
});
