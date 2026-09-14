import { expect, type Page, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

/** A forgotten card returns within the review, and the same log gives the same next card anywhere, ADR 0019. */

async function addDeck(page: Page, name: string, terms: number) {
  const deck = await page.request.post("/api/decks", { data: { name, defaultLanguage: "it" } });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  for (let i = 0; i < terms; i++) {
    const card = await page.request.post("/api/cards", {
      data: { deckId, term: `${name} ${i}`, meaning: `meaning ${i}`, language: "it" },
    });
    expect(card.ok()).toBeTruthy();
  }
  return deckId;
}

/** The card on screen, by its accessible name. */
async function currentCard(page: Page) {
  const card = page.getByLabel(/ card for /);
  await expect(card).toBeVisible();
  return (await card.getAttribute("aria-label")) as string;
}

/** Reveal and grade the card on screen by keyboard, and wait for the attempt to count. */
async function grade(page: Page, key: "1" | "3", attemptsAfter: number) {
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
  await page.keyboard.press(key);
  await expect(page.getByText(`${attemptsAfter} of 50`, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Good/ })).toBeHidden();
}

/** Grade Good until `card` is back on screen, and return how many attempts that took. */
async function gradeUntil(page: Page, card: string, attempts: number, limit: number) {
  for (let n = 0; n < limit; n++) {
    if ((await currentCard(page)) === card) return n;
    await grade(page, "3", attempts + n + 1);
  }
  await expect(page.getByLabel(card, { exact: true })).toBeVisible();
  return limit;
}

test("a forgotten card comes back in the same review", async ({ page }, testInfo) => {
  await signInAsTestLearner(page, testInfo, "review-returns");
  await addDeck(page, "Returns", 10);
  await page.goto("/review");
  await expect(page.getByText("0 of 50", { exact: true })).toBeVisible();

  const forgotten = await currentCard(page);
  await test.step("forget a card", async () => {
    await grade(page, "1", 1);
    expect(await currentCard(page)).not.toBe(forgotten);
  });

  await test.step("it returns within four attempts", async () => {
    const between = await gradeUntil(page, forgotten, 1, 4);
    expect(between).toBeGreaterThanOrEqual(2);
  });

  await test.step("a reload shows the same card and count", async () => {
    const count = await page.getByText(/^\d+ of 50$/).textContent();
    await page.reload();
    await expect(page.getByText(count ?? "", { exact: true })).toBeVisible();
    await expect(page.getByLabel(forgotten, { exact: true })).toBeVisible();
  });
});

test("grades that could not be sent still decide the next card after a reload", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await signInAsTestLearner(page, testInfo, "review-queued");
  await addDeck(page, "Queued", 10);
  await page.goto("/review");
  await expect(page.getByText("0 of 50", { exact: true })).toBeVisible();

  // The connection drops for grades only, so the page itself can still reload.
  await page.route("**/api/review/grade", (route) => route.abort("internetdisconnected"));
  const forgotten = await currentCard(page);
  await grade(page, "1", 1);
  await grade(page, "3", 2);
  const next = await currentCard(page);

  await page.reload();
  await expect(page.getByText("2 of 50", { exact: true })).toBeVisible();
  await expect(page.getByLabel(next, { exact: true })).toBeVisible();
  await gradeUntil(page, forgotten, 2, 3);

  await test.step("the queued grades reach the server once the connection returns", async () => {
    await page.unroute("**/api/review/grade");
    await page.reload();
    await expect
      .poll(
        async () =>
          ((await (await page.request.get("/api/review/draw")).json()) as { attempts: number })
            .attempts,
      )
      .toBeGreaterThanOrEqual(2);
    await expect(page.getByLabel(forgotten, { exact: true })).toBeVisible();
  });
});

test("offline, grading still works, running out claims nothing, and it all syncs later", async ({
  page,
  context,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await signInAsTestLearner(page, testInfo, "review-offline");
  await addDeck(page, "Offline", 3);
  await page.goto("/review");
  await expect(page.getByText("0 of 50", { exact: true })).toBeVisible();

  await context.setOffline(true);
  await test.step("grade every card with the browser offline", async () => {
    await grade(page, "3", 1);
    await grade(page, "3", 2);
    await grade(page, "3", 3);
    await expect(
      page.getByRole("heading", { name: "Couldn’t check for more cards" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "That’s the lot" })).toBeHidden();
  });

  await test.step("the queued grades reach the server once the connection returns", async () => {
    await context.setOffline(false);
    await expect
      .poll(
        async () =>
          ((await (await page.request.get("/api/review/draw")).json()) as { attempts: number })
            .attempts,
      )
      .toBe(3);
    // The paused check resumes with the connection and confirms the day.
    await expect(page.getByRole("heading", { name: "That’s the lot" })).toBeVisible();
  });
});

test("a round from Today walks its own cards and ends with Round done", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await signInAsTestLearner(page, testInfo, "review-round");
  await addDeck(page, "Round", 4);

  await page.goto("/review");
  const forgotten = await currentCard(page);
  await grade(page, "1", 1);

  await page.goto("/review?round=forgotten");
  await expect(page.getByLabel(forgotten, { exact: true })).toBeVisible();
  await expect(page.getByText("1 of 50", { exact: true })).toBeVisible();
  await grade(page, "3", 2);
  await expect(page.getByRole("heading", { name: "Round done" })).toBeVisible();
});

test("a return missed in a deck review comes up in the all-decks review", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await signInAsTestLearner(page, testInfo, "review-scope");
  const first = await addDeck(page, "First", 6);
  await addDeck(page, "Second", 6);

  await page.goto(`/review?deck=${first}`);
  const forgotten = await currentCard(page);
  expect(forgotten).toMatch(/card for First/);
  await grade(page, "1", 1);

  await page.goto("/review");
  await expect(page.getByText("1 of 50", { exact: true })).toBeVisible();
  await gradeUntil(page, forgotten, 1, 4);
});

test("midnight starts a new day, and yesterday's forgotten card comes first", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await page.clock.install({ time: new Date() });
  await signInAsTestLearner(page, testInfo, "review-midnight");
  await addDeck(page, "Midnight", 8);
  await page.goto("/review");

  const forgotten = await currentCard(page);
  await grade(page, "1", 1);
  await grade(page, "3", 2);
  expect(await currentCard(page)).not.toBe(forgotten);

  await page.clock.fastForward("24:00:00");
  await expect(page.getByText("0 of 50", { exact: true })).toBeVisible();
  // The card on screen keeps its place; the one after it is yesterday's miss.
  await grade(page, "3", 1);
  await expect(page.getByLabel(forgotten, { exact: true })).toBeVisible();
});
