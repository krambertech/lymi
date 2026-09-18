import { startAsTestLearner } from "./auth";
import type { Page } from "./test";
import { expect, test } from "./test";

/**
 * One deck's tile on a shelf, found by its name. The tile's link wraps the whole group, so its
 * accessible name is everything on the card; the heading is what names the deck. Other journeys
 * publish into the same catalogue, so a tile is always scoped and never counted.
 */
const tile = (page: Page, name: string) =>
  page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });

/**
 * Explore inside the product: a learner finds a published deck without leaving Lymi and adds it
 * in one press. Adding from a shelf leaves them browsing; adding from the deck's own page opens
 * it in Library. Issue #106, ADR 0016, ADR 0020.
 */
test("a learner adds a published deck from Explore without leaving the app", async ({
  page,
  browser,
}, testInfo) => {
  const suffix = `${testInfo.project.name}-r${testInfo.retry}-p${testInfo.repeatEachIndex}`;
  // Names and terms no other journey uses: one publisher account holds them all, and the
  // duplicate rule would skip a card whose term another journey had already published.
  const onShelf = { name: `Explore Estonian ${suffix}`, slug: `app-estonian-${suffix}` };
  const onPage = { name: `Explore Driving ${suffix}`, slug: `app-driving-${suffix}` };
  const ids: Record<string, string> = {};

  await test.step("the publisher publishes two decks in different categories", async () => {
    await startAsTestLearner(page, testInfo, "publisher");
    const decks = [
      { deck: onShelf, category: "languages", term: `hommikust ${suffix}`, meaning: "morning" },
      { deck: onPage, category: "driving", term: `peatee ${suffix}`, meaning: "priority road" },
    ] as const;
    for (const { deck, category, term, meaning } of decks) {
      const created = await page.request.post("/api/decks", {
        data: { name: deck.name, defaultLanguage: "et" },
      });
      expect(created.ok()).toBeTruthy();
      const deckId = ((await created.json()) as { id: string }).id;
      ids[deck.slug] = deckId;
      const card = await page.request.post("/api/cards", { data: { deckId, term, meaning } });
      expect(card.ok()).toBeTruthy();
      const published = await page.request.put(`/api/decks/${deckId}/publication`, {
        data: {
          slug: deck.slug,
          summary: `What ${deck.name} is for.`,
          level: "A1",
          category,
          meaningLanguage: "en",
          publisher: "Lymi",
        },
      });
      expect(published.ok()).toBeTruthy();
    }
  });

  const learner = await (await browser.newContext()).newPage();
  await startAsTestLearner(learner, testInfo, "explore");

  await test.step("Explore lists both decks, each under its category", async () => {
    await learner.goto("/explore");
    await expect(learner.getByRole("heading", { name: "Explore", exact: true })).toBeVisible();
    await expect(learner.getByRole("heading", { name: "Languages", exact: true })).toBeVisible();
    await expect(learner.getByRole("heading", { name: "Driving", exact: true })).toBeVisible();
    await expect(tile(learner, onShelf.name)).toBeVisible();
    await expect(tile(learner, onPage.name)).toBeVisible();
  });

  await test.step("adding from a shelf keeps the learner on Explore and marks that tile", async () => {
    await learner.getByRole("button", { name: `Add “${onShelf.name}” to your library` }).click();
    await expect(learner.getByText(`“${onShelf.name}” is in your library`)).toBeVisible();
    await expect(learner).toHaveURL(/\/explore$/);
    await expect(
      tile(learner, onShelf.name).getByRole("link", { name: "In your library" }),
    ).toBeVisible();
    // The deck it did not touch still offers its own press.
    await expect(
      tile(learner, onPage.name).getByRole("button", { name: /to your library$/ }),
    ).toBeVisible();
  });

  await test.step("the deck's own page names its publisher and lists every card", async () => {
    await tile(learner, onPage.name).getByRole("link").first().click();
    await expect(learner).toHaveURL(new RegExp(`/explore/${onPage.slug}$`));
    await expect(learner.getByRole("heading", { name: onPage.name, exact: true })).toBeVisible();
    await expect(learner.getByText("By Lymi")).toBeVisible();
    await learner.getByText("Cards outside a section").click();
    await expect(learner.getByText("priority road", { exact: true })).toBeVisible();
  });

  await test.step("a reload keeps the added deck marked and still offers the other", async () => {
    await learner.goto("/explore");
    await expect(
      tile(learner, onShelf.name).getByRole("link", { name: "In your library" }),
    ).toBeVisible();
    await expect(
      tile(learner, onShelf.name).getByRole("button", { name: /to your library$/ }),
    ).toHaveCount(0);
    await expect(
      tile(learner, onPage.name).getByRole("button", { name: /to your library$/ }),
    ).toBeVisible();
  });

  await test.step("an unknown slug says so and offers the way back", async () => {
    await learner.goto("/explore/never-published-deck");
    await expect(
      learner.getByRole("heading", { name: "This deck is not published" }),
    ).toBeVisible();
    await learner.getByRole("link", { name: "Back to Explore" }).click();
    await expect(learner).toHaveURL(/\/explore$/);
  });

  // Last, because it leaves the app on another screen: nothing after it can race the router.
  await test.step("adding from the deck's page opens it in Library", async () => {
    await learner.goto(`/explore/${onPage.slug}`);
    await learner.getByRole("button", { name: "Add to your library" }).click();
    await learner.waitForURL(new RegExp(`/library/${ids[onPage.slug]}$`));
    await expect(learner.getByRole("heading", { name: onPage.name, exact: true })).toBeVisible();
    await expect(learner.getByText(`peatee ${suffix}`, { exact: true })).toBeVisible();
  });

  await learner.context().close();
});
