import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

/** Today moves on with no review open: when an offline grade lands, and when the day turns. */

async function addDeck(page: Page, name: string, terms: number) {
  const deck = await page.request.post("/api/decks", { data: { name, defaultLanguage: "it" } });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  const cards = await page.request.post("/api/cards/batch", {
    data: {
      cards: Array.from({ length: terms }, (_, i) => ({
        deckId,
        term: `${name} ${i}`,
        meaning: `meaning ${i}`,
      })),
    },
  });
  expect(cards.ok()).toBeTruthy();
}

test("an offline grade that lands moves the streak and the counts on Today", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await startAsTestLearner(page, testInfo, "sync-replay");
  const goal = await page.request.patch("/api/settings", { data: { dailyGoal: 1 } });
  expect(goal.ok()).toBeTruthy();
  await addDeck(page, "Replay", 3);

  const deck = page.getByRole("link", { name: /^Replay \d/ });
  const streak = page.getByRole("button", { name: /^Streak: / }).first();

  await test.step("a grade made while it cannot reach the server stays queued", async () => {
    await page.route("**/api/review/grade", (route) => route.abort("internetdisconnected"));
    await page.goto("/review");
    await expect(page.getByLabel(/ card for /)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
    const sent = page.waitForRequest("**/api/review/grade");
    await page.keyboard.press("3");
    await sent;
  });

  await test.step("Today still reads as it did before the grade", async () => {
    await page.goto("/today");
    await expect(deck).toHaveAccessibleName("Replay 3");
    await expect(streak).toHaveAccessibleName("Streak: 0 days in a row");
  });

  await test.step("the grade lands and Today follows, with no review open", async () => {
    await page.unroute("**/api/review/grade");
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(streak).toHaveAccessibleName("Streak: 1 day in a row");
    await expect(deck).toHaveAccessibleName("Replay 2");
  });
});

test("the end of the learner's day refreshes Today with no review open", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await startAsTestLearner(page, testInfo, "sync-turn");
  await addDeck(page, "Turn", 2);

  // From the first draw, so a slow load cannot start the page past the end of its day.
  let end: string | undefined;
  await page.route("**/api/review/draw*", async (route) => {
    const response = await route.fetch();
    const draw = (await response.json()) as { day: { end: string } };
    end ??= new Date(Date.now() + 8000).toISOString();
    await route.fulfill({ response, json: { ...draw, day: { ...draw.day, end } } });
  });
  await page.goto("/today");
  await expect(page.getByRole("link", { name: "Turn 2" })).toBeVisible();

  const asked = (method: string, path: string) =>
    page.waitForRequest(
      (request) =>
        request.method() === method &&
        new URL(request.url()).pathname === path &&
        end !== undefined &&
        Date.now() >= new Date(end).getTime(),
      { timeout: 15_000 },
    );
  await Promise.all([
    asked("GET", "/api/decks"),
    asked("GET", "/api/stats/streak"),
    asked("GET", "/api/review/rounds"),
    asked("POST", "/api/review/today"),
  ]);
});
