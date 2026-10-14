import { createAccountThroughDevForm, startAsTestLearner } from "./auth";
import { expect, newTestContext, persistedCache, type TestInfo, test } from "./test";

/** An email on no allowlist and not a local persona, so only the published deck can admit it. */
function stranger(testInfo: TestInfo, who: string) {
  return `e2e-${who}-${testInfo.project.name}-r${testInfo.retry}-p${testInfo.repeatEachIndex}@example.test`;
}

test("anyone can add a published deck, and a withdrawn one admits nobody new", async ({
  page,
  browser,
}, testInfo) => {
  const suffix = `${testInfo.project.name}-r${testInfo.retry}-p${testInfo.repeatEachIndex}`;
  const deckName = `Everyday Estonian ${suffix}`;
  const slug = `everyday-estonian-${suffix}`;
  let deckId = "";

  await test.step("the publisher publishes a deck", async () => {
    await startAsTestLearner(page, testInfo, "publisher");
    const deck = await page.request.post("/api/decks", {
      data: { name: deckName, defaultLanguage: "et" },
    });
    expect(deck.ok()).toBeTruthy();
    deckId = ((await deck.json()) as { id: string }).id;
    const card = await page.request.post("/api/cards", {
      data: { deckId, term: "tere hommikust", meaning: "good morning" },
    });
    expect(card.ok()).toBeTruthy();

    const published = await page.request.put(`/api/decks/${deckId}/publication`, {
      data: {
        slug,
        summary: "Words and phrases for your first weeks in Estonia.",
        meaningLanguage: "en",
        publisher: "Lymi",
      },
    });
    expect(published.ok()).toBeTruthy();
    const { publication } = (await published.json()) as { publication: { addUrl: string } };
    expect(new URL(publication.addUrl).pathname).toBe(`/add/${slug}`);
  });

  await test.step("the add page's metadata names the deck and carries no cards", async () => {
    const response = await page.request.get(`/add/${slug}`);
    expect(response.status()).toBe(200);
    // robots.txt allows add links so a crawler can read this and keep them out of results.
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    const html = await response.text();
    expect(html).toContain(`<title>Add ${deckName} to Lymi</title>`);
    const meta = (html.match(/<meta [^>]*>/g) ?? []).join("\n");
    expect(meta).not.toMatch(/tere hommikust|good morning/);
  });

  const visitor = await (await newTestContext(browser)).newPage();

  await test.step("a signed-out visitor signs up from the add page", async () => {
    await visitor.goto(`/add/${slug}?dev=1`);
    await expect(visitor.getByRole("heading", { name: deckName, exact: true })).toBeVisible();
    await expect(visitor.getByText("From Lymi")).toBeVisible();
    await expect(visitor.getByRole("button", { name: "Add with Google" })).toBeVisible();

    await visitor.getByRole("button", { name: "Dev sign-in", exact: true }).click();
    await expect(visitor).toHaveURL(/\/login\?dev=1/);
    await createAccountThroughDevForm(visitor, stranger(testInfo, "visitor"));
  });

  await test.step("the new account is welcomed with its deck, chooses a goal and reviews", async () => {
    await expect(visitor).toHaveURL(new RegExp(`/welcome\\?deck=${deckId}$`));
    await expect(visitor.getByRole("heading", { name: "Welcome to Lymi" })).toBeVisible();
    await expect(visitor.getByRole("heading", { name: deckName, exact: true })).toBeVisible();
    // Kept before the goal is saved, so a quick return to Welcome below can restore this copy.
    await expect.poll(() => persistedCache(visitor)).toContain('"onboardedAt":null');
    await visitor.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(visitor.getByRole("heading", { name: "How much time a day?" })).toBeVisible();
    await visitor.getByRole("radio", { name: /Light/ }).click();
    await visitor.getByRole("button", { name: "Start review", exact: true }).click();

    await expect(visitor).toHaveURL(new RegExp(`/review\\?deck=${deckId}$`));
    // The card's label names what it asks, whichever direction the deck starts with.
    await expect(visitor.getByLabel(/ card for (tere hommikust|good morning)$/)).toBeVisible();
    const settings = await visitor.request.get("/api/settings");
    expect(await settings.json()).toMatchObject({ dailyGoal: 10, learningKind: null });
  });

  await test.step("leaving the review lands on Today, and the goal question never returns", async () => {
    await visitor.getByRole("button", { name: "Leave review" }).click();
    await expect(visitor).toHaveURL(/\/today$/);
    await expect(visitor.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await visitor.goto("/welcome", { waitUntil: "commit" });
    await expect(visitor).toHaveURL(/\/today$/);
    await expect(visitor.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
  });

  await test.step("opening the add page again changes nothing", async () => {
    await visitor.goto(`/add/${slug}`);
    await expect(visitor.getByText("This deck is already in Library.")).toBeVisible();
    await expect(visitor.getByRole("link", { name: "Open deck" })).toBeVisible();
  });

  await test.step("withdrawing keeps the learner and turns newcomers away", async () => {
    const withdrawn = await page.request.delete(`/api/decks/${deckId}/publication`);
    expect(withdrawn.ok()).toBeTruthy();
    expect((await page.request.get(`/add/${slug}`)).status()).toBe(410);

    await visitor.goto(`/add/${slug}`);
    await expect(
      visitor.getByRole("heading", { name: "This deck is no longer published" }),
    ).toBeVisible();
    await expect(visitor.getByRole("link", { name: "Open deck" })).toBeVisible();

    const latecomer = await (await newTestContext(browser)).newPage();
    await latecomer.goto(`/add/${slug}?dev=1`);
    await expect(
      latecomer.getByRole("heading", { name: "This deck is no longer published" }),
    ).toBeVisible();
    await expect(latecomer.getByRole("button", { name: "Dev sign-in" })).toHaveCount(0);
    await latecomer.context().close();
  });

  await visitor.context().close();
});
