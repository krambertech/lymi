import { startAsTestLearner } from "./auth";
import { expect, test } from "./test";

/**
 * Welcome: a new account answers three questions and is reviewing a ready-made deck in the
 * language it chose. Every account starts here, so it is a journey. docs/design/onboarding.md.
 */
test("a new learner picks a language and a goal and starts reviewing a ready-made deck", async ({
  page,
  browser,
}, testInfo) => {
  const suffix = `${testInfo.project.name}-r${testInfo.retry}-p${testInfo.repeatEachIndex}`;
  // Icelandic is this journey's own, so the deck is among the few Welcome offers for it.
  const deck = { name: `Welcome Icelandic ${suffix}`, slug: `welcome-icelandic-${suffix}` };
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

  const learner = await (await browser.newContext()).newPage();
  await startAsTestLearner(learner, testInfo, "welcome", undefined, { welcomed: false });

  await test.step("Today sends a new account to Welcome", async () => {
    await learner.goto("/today");
    await expect(learner).toHaveURL(/\/welcome$/);
    await expect(learner.getByRole("heading", { name: "What are you learning?" })).toBeVisible();
  });

  await test.step("the learner says it is a language, and which", async () => {
    await learner.getByRole("radio", { name: /A language/ }).click();
    await learner.getByRole("button", { name: "Continue", exact: true }).click();
    await learner.getByRole("radio", { name: "Icelandic", exact: true }).click();
    await learner.getByRole("button", { name: "Continue", exact: true }).click();
  });

  await test.step("the learner chooses a light daily goal", async () => {
    await expect(learner.getByRole("heading", { name: "How much time a day?" })).toBeVisible();
    await learner.getByRole("radio", { name: /Light/ }).click();
    await learner.getByRole("button", { name: "Continue", exact: true }).click();
  });

  await test.step("the ready-made Icelandic deck starts a review", async () => {
    await expect(
      learner.getByRole("heading", { name: "Ready-made decks in Icelandic" }),
    ).toBeVisible();
    await learner.getByRole("radio", { name: new RegExp(deck.name) }).click();
    await learner.getByRole("button", { name: "Add and review", exact: true }).click();
    await expect(learner).toHaveURL(/\/review$/);
    await expect(learner.getByText(term, { exact: true })).toBeVisible();
  });

  await test.step("Welcome never comes back, and the goal is the one chosen", async () => {
    await learner.goto("/today");
    await expect(
      learner.getByRole("heading", { level: 1, name: "Today", exact: true }),
    ).toBeVisible();
    await expect(learner).toHaveURL(/\/today$/);
    const settings = await learner.request.get("/api/settings");
    expect(await settings.json()).toMatchObject({ dailyGoal: 10, learningLanguage: "is" });
  });

  await learner.context().close();
});
