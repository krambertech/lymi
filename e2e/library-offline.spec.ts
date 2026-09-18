import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

/** The deck list, and only that: sign-in and the rest of the screen still reach the server. */
const DECK_LIST = "**/api/decks";

/** Which queries the cache that survives a reload holds. The persister writes it a moment late. */
function persistedQueries(page: Page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("lymi-query-cache");
    if (!raw) return [] as string[];
    const cache = JSON.parse(raw) as { clientState: { queries: { queryKey: unknown }[] } };
    return cache.clientState.queries.map((query) => JSON.stringify(query.queryKey));
  });
}

/**
 * Library is the way to every deck, so a failed deck list has to say so and offer a way back.
 * A learner who has seen their decks keeps them; one who has not gets an error with Try again,
 * never a skeleton that never resolves.
 */
test("a learner whose deck list fails sees an error they can retry", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "loading states, not rendering");
  await startAsTestLearner(page, testInfo, "library-offline");
  const deckName = `Lezione offline ${testInfo.project.name}`;
  const created = await page.request.post("/api/decks", {
    data: { name: deckName, defaultLanguage: "it" },
  });
  expect(created.status()).toBe(201);

  await test.step("with a cached list, Library and the rail still show the decks", async () => {
    await page.goto("/library");
    await expect(page.getByText(deckName, { exact: true }).first()).toBeVisible();
    await expect
      .poll(() => persistedQueries(page), { message: "decks never persisted" })
      .toContain('["decks"]');

    await page.route(DECK_LIST, (route) => route.abort("internetdisconnected"));
    await page.reload();
    await expect(page.getByText(deckName, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Couldn’t load Library" })).toBeHidden();
  });

  await test.step("with nothing cached, it says what failed instead of waiting", async () => {
    // Emptied before the app boots: clearing from the page races the persister writing it back.
    await page.addInitScript(() => window.localStorage.clear());
    await page.reload();
    await expect(page.getByRole("heading", { name: "Couldn’t load Library" })).toBeVisible();
    await expect(page.getByText(deckName, { exact: true })).toHaveCount(0);
  });

  await test.step("Try again brings the decks back once the server answers", async () => {
    await page.unroute(DECK_LIST);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Couldn’t load Library" })).toBeHidden();
    await expect(page.getByText(deckName, { exact: true }).first()).toBeVisible();
  });
});
