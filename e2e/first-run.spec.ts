import { startAsTestLearner } from "./auth";
import { expect, newTestContext, test } from "./test";

/**
 * A new account starts on Today: the first-run guide, ways to make a deck, and ready-made decks
 * narrowed by what the learner is learning. Every account starts here, so it is a journey.
 * docs/design/onboarding.md.
 */
test("a new learner picks a ready-made deck on Today and starts reviewing it", async ({
  page,
  browser,
}, testInfo) => {
  const suffix = `${testInfo.project.name}-r${testInfo.retry}-p${testInfo.repeatEachIndex}`;
  // Icelandic is this journey's own, so choosing it leaves this deck among the few on offer.
  const deck = { name: `First run Icelandic ${suffix}`, slug: `first-run-icelandic-${suffix}` };
  const term = `góðan daginn ${suffix}`;

  await test.step("the publisher publishes an Icelandic deck", async () => {
    await startAsTestLearner(page, testInfo, "publisher");
    const created = await page.request.post("/api/decks", {
      data: { name: deck.name, defaultLanguage: "is" },
    });
    expect(created.ok()).toBeTruthy();
    const deckId = ((await created.json()) as { id: string }).id;
    const card = await page.request.post("/api/cards", {
      data: { deckId, term, meaning: "good morning" },
    });
    expect(card.ok()).toBeTruthy();
    const published = await page.request.put(`/api/decks/${deckId}/publication`, {
      data: {
        slug: deck.slug,
        summary: `What ${deck.name} is for.`,
        category: "languages",
        meaningLanguage: "en",
        publisher: "Lymi",
      },
    });
    expect(published.ok()).toBeTruthy();
  });

  const learner = await (await newTestContext(browser)).newPage();
  await startAsTestLearner(learner, testInfo, "first-run", undefined, { welcomed: false });

  await test.step("a new account lands on Today's first-run guide", async () => {
    await learner.goto("/welcome");
    await expect(learner).toHaveURL(/\/today$/);
    await expect(learner.getByRole("heading", { name: /^Welcome, / })).toBeVisible();
    await expect(learner.getByRole("heading", { name: "Create your first deck" })).toBeVisible();
  });

  await test.step("getting there sets the starting goal", async () => {
    await expect
      .poll(async () => (await (await learner.request.get("/api/settings")).json()).dailyGoal)
      .toBe(25);
  });

  await test.step("the learner searches for Icelandic and adds its deck", async () => {
    await learner.getByRole("combobox", { name: "What the decks are about" }).click();
    await learner.getByPlaceholder("Search languages").fill("Icel");
    await learner.getByRole("option", { name: /^Icelandic/ }).click();
    await expect(
      learner.getByRole("heading", { name: "Explore ready-made decks about Icelandic" }),
    ).toBeVisible();
    const tile = learner.getByRole("listitem").filter({ hasText: deck.name });
    await tile.getByRole("button", { name: /^Add/ }).click();
    await expect(learner).toHaveURL(/\/review\?deck=/);
    // The card's label names what it asks, whichever direction the deck starts with.
    await expect(learner.getByLabel(new RegExp(` card for (${term}|good morning)$`))).toBeVisible();
  });

  await learner.context().close();
});
