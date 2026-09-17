import { signInAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

/** The end of a review: what it says and offers depends on where the day stands. PRODUCT.md, "Daily Review Goal". */

async function setGoal(page: Page, goal: number) {
  const settings = await page.request.patch("/api/settings", { data: { dailyGoal: goal } });
  expect(settings.ok()).toBeTruthy();
}

async function addDeck(page: Page, name: string) {
  const deck = await page.request.post("/api/decks", { data: { name, defaultLanguage: "it" } });
  expect(deck.ok()).toBeTruthy();
  return ((await deck.json()) as { id: string }).id;
}

async function addCards(page: Page, deckId: string, name: string, terms: number) {
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

/** The card on screen, by its accessible name. */
async function currentCard(page: Page) {
  const card = page.getByLabel(/ card for /);
  await expect(card).toBeVisible();
  return (await card.getAttribute("aria-label")) as string;
}

/** Reveal and grade the card on screen with the pointer, so it works on a phone too. */
async function grade(page: Page, name: "Forgot" | "Good") {
  await currentCard(page);
  // Press the corner: on a phone the card's centre can land on the pronunciation button.
  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("button", { name: /^Good/ })).toBeHidden();
}

const heading = (page: Page, name: string) =>
  page.getByRole("heading", { level: 2, name, exact: true });

test("at the goal a learner can review forgotten cards, take another round, or stop", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  // Tap-to-finish exists only under motion, and the suite's reduced motion makes the end instant,
  // so the first step alone plays the sequence for real and the rest stay quiet. docs/testing.md.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await signInAsTestLearner(page, testInfo, "review-goal");
  await setGoal(page, 3);
  await addCards(page, await addDeck(page, "Goal"), "Goal", 16);
  await page.goto("/review");

  const forgotten = await currentCard(page);
  await test.step("the third attempt reaches the goal, whatever its grade", async () => {
    await grade(page, "Forgot");
    await grade(page, "Good");
    await grade(page, "Good");
    await expect(heading(page, "Daily goal reached")).toBeVisible();
    // A tap during the celebration finishes it; it must not also press the still-invisible Done,
    // so the click is forced past the actionability check that pointer-events-none would fail.
    await page.getByRole("link", { name: "Done", exact: true }).click({ force: true });
    await expect(heading(page, "Daily goal reached")).toBeVisible();
    await expect(page).toHaveURL(/\/review$/);
    await expect(page.getByText(/^3\s*reviews today$/)).toBeVisible();
    await expect(page.getByText(/^1\s*day in a row$/)).toBeVisible();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await test.step("Review forgotten counts its own card and ends as a round", async () => {
    await page.getByRole("button", { name: /Review \d+ forgotten card/ }).click();
    await expect(page.getByLabel(forgotten, { exact: true })).toBeVisible();
    await expect(page.getByText("0 of 1", { exact: true })).toBeVisible();
    await grade(page, "Good");
    await expect(heading(page, "Round done")).toBeVisible();
    await expect(page.getByText(/^1\s*review in this round$/)).toBeVisible();
    await expect(page.getByText("4 reviews today", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Review \d+ forgotten card/ })).toBeHidden();
  });

  await test.step("another round counts to ten and stops", async () => {
    await page.getByRole("button", { name: "Review 10 more cards", exact: true }).click();
    await expect(page.getByText("0 of 10", { exact: true })).toBeVisible();
    for (let n = 0; n < 10; n++) await grade(page, "Good");
    await expect(heading(page, "Round done")).toBeVisible();
    await expect(page.getByText(/^10\s*reviews in this round$/)).toBeVisible();
    await expect(page.getByText("14 reviews today", { exact: true })).toBeVisible();
    await expect(page.getByText(/^1\s*day in a row$/)).toBeVisible();
  });

  await test.step("Done leaves for Today", async () => {
    await page.getByRole("link", { name: "Done", exact: true }).click();
    await expect(page).toHaveURL(/\/today$/);
  });
});

test("the end works from the keyboard and without motion, and a short round ends with the cards", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "keyboard and logic, not rendering");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAsTestLearner(page, testInfo, "review-goal-small");
  await setGoal(page, 3);
  const deckId = await addDeck(page, "Small");

  await test.step("with nothing due, Add cards opens the capture sheet", async () => {
    await page.goto("/review");
    await expect(heading(page, "Nothing due")).toBeVisible();
    await page.getByRole("button", { name: "Add cards", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(heading(page, "Nothing due")).toBeVisible();
  });

  await addCards(page, deckId, "Small", 5);
  await page.goto("/review");
  await test.step("the goal's heading takes focus", async () => {
    for (let n = 0; n < 3; n++) {
      await expect(page.getByLabel(/ card for /)).toBeVisible();
      await page.keyboard.press("Space");
      await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
      await page.keyboard.press("3");
      await expect(page.getByText(`${n + 1} of 3`, { exact: true })).toBeVisible();
    }
    await expect(heading(page, "Daily goal reached")).toBeFocused();
    await expect(page.getByText(/^3\s*reviews today$/)).toBeVisible();
  });

  await test.step("another round holds only what is left, and then is not offered", async () => {
    await page.keyboard.press("Tab");
    const another = page.getByRole("button", { name: /Review \d+ more card/ });
    await expect(another).toBeFocused();
    await expect(another).toHaveText("Review 2 more cards");
    await page.keyboard.press("Enter");
    for (let n = 0; n < 2; n++) {
      await expect(page.getByLabel(/ card for /)).toBeVisible();
      await page.keyboard.press("Space");
      await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
      await page.keyboard.press("3");
      await expect(page.getByText(`${n + 1} of 2`, { exact: true })).toBeVisible();
    }
    // Those were the last cards, so the end says so rather than Round done.
    await expect(heading(page, "Nothing left today")).toBeVisible();
    await expect(page.getByText(/^2\s*reviews in this round$/)).toBeVisible();
    await expect(page.getByText("5 reviews today", { exact: true })).toBeVisible();
    await expect(another).toBeHidden();
  });
});

test("a round left open past midnight gives way to the new day's goal", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAsTestLearner(page, testInfo, "review-goal-midnight");
  await setGoal(page, 2);
  await addCards(page, await addDeck(page, "Midnight"), "Midnight", 14);
  // Motion starts native animations at the faked performance.now(), so time faked before this page loads delays every exit by that much.
  await page.clock.install({ time: new Date() });
  await page.goto("/review");
  // After the jump past midnight a rolled count would never leave, and keyboard grades do not roll it.
  const gradeByKey = async (after: string) => {
    await expect(page.getByLabel(/ card for /)).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.getByText(after, { exact: true })).toBeVisible();
  };

  await gradeByKey("1 of 2");
  await gradeByKey("2 of 2");
  await expect(heading(page, "Daily goal reached")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await gradeByKey("1 of 10");

  await page.clock.fastForward("24:00:00");
  await expect(page.getByText("0 of 2", { exact: true })).toBeVisible();
  await gradeByKey("1 of 2");
  await gradeByKey("2 of 2");
  await expect(heading(page, "Daily goal reached")).toBeVisible();
  await expect(page.getByText(/^2\s*reviews today$/)).toBeVisible();
});

/** Grade the card on screen by keyboard and wait for the header to read `after`. */
async function gradeWithKey(page: Page, key: "1" | "3", after: string) {
  await expect(page.getByLabel(/ card for /)).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
  await page.keyboard.press(key);
  await expect(page.getByText(after, { exact: true })).toBeVisible();
}

test("a round from Today counts its own cards, and below the goal offers the rest of it", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAsTestLearner(page, testInfo, "review-round-below");
  await setGoal(page, 5);
  await addCards(page, await addDeck(page, "Below"), "Below", 8);

  await page.goto("/review");
  await gradeWithKey(page, "1", "1 of 5");

  await test.step("the round's track counts the round, not the goal", async () => {
    await page.goto("/review?round=forgotten");
    await expect(page.getByText("0 of 1", { exact: true })).toBeVisible();
    await gradeWithKey(page, "3", "1 of 1");
    await expect(heading(page, "Round done")).toBeVisible();
    await expect(page.getByText(/^1\s*review in this round$/)).toBeVisible();
    await expect(page.getByText("2 of 5 reviews today", { exact: true })).toBeVisible();
  });

  await test.step("the rest of the goal picks up the goal's own track", async () => {
    await page.getByRole("button", { name: "Review 3 more cards", exact: true }).click();
    await expect(page).toHaveURL(/\/review$/);
    await expect(page.getByText("2 of 5", { exact: true })).toBeVisible();
    await gradeWithKey(page, "3", "3 of 5");
    await gradeWithKey(page, "3", "4 of 5");
    await page.keyboard.press("Space");
    await page.keyboard.press("3");
    await expect(heading(page, "Daily goal reached")).toBeVisible();
    await expect(page.getByText(/^5\s*reviews today$/)).toBeVisible();
    await expect(page.getByText(/^1\s*day in a row$/)).toBeVisible();
  });
});

test("a round that crosses the goal keeps going and says the goal is reached", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAsTestLearner(page, testInfo, "review-round-crosses");
  await setGoal(page, 5);
  await addCards(page, await addDeck(page, "Cross"), "Cross", 8);

  await page.goto("/review");
  await gradeWithKey(page, "1", "1 of 5");
  await gradeWithKey(page, "1", "2 of 5");
  await gradeWithKey(page, "1", "3 of 5");

  await test.step("a round reopened from Today counts what is left of it", async () => {
    await page.goto("/review?round=forgotten");
    await expect(page.getByText("0 of 3", { exact: true })).toBeVisible();
    await gradeWithKey(page, "3", "1 of 3");
    await page.getByRole("button", { name: "Leave review" }).click();
    await page.getByRole("link", { name: /Review forgotten/ }).click();
    await expect(page.getByText("0 of 2", { exact: true })).toBeVisible();
  });

  await test.step("the goal's attempt lands mid-round without stopping it", async () => {
    await gradeWithKey(page, "3", "1 of 2");
    await expect(heading(page, "Daily goal reached")).toBeHidden();
    await gradeWithKey(page, "3", "2 of 2");
  });
  await expect(heading(page, "Daily goal reached")).toBeVisible();
  await expect(page.getByText(/^2\s*reviews in this round$/)).toBeVisible();
  await expect(page.getByText("6 reviews today", { exact: true })).toBeVisible();
  await expect(page.getByText(/^1\s*day in a row$/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Review \d+ more card/ })).toBeVisible();
});

test("a deck that runs out below the goal names itself and offers the other decks", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "logic, not rendering");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signInAsTestLearner(page, testInfo, "review-deck-out");
  await setGoal(page, 10);
  const first = await addDeck(page, "Spanish");
  await addCards(page, first, "Spanish", 2);
  const second = await addDeck(page, "Chess");
  await addCards(page, second, "Chess", 3);
  await addDeck(page, "Empty");

  await page.goto(`/review?deck=${first}`);
  await gradeWithKey(page, "3", "1 of 10");
  await page.keyboard.press("Space");
  await page.keyboard.press("3");
  await expect(heading(page, "Nothing left in Spanish")).toBeVisible();
  await expect(page.getByText(/^0\s*days in a row$/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Review \d+ cards? in Empty$/ })).toBeHidden();

  await page.getByRole("button", { name: "Review 3 cards in Chess", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`deck=${second}`));
  await expect(page.getByText("2 of 10", { exact: true })).toBeVisible();
  expect(await page.getByLabel(/ card for /).getAttribute("aria-label")).toMatch(/card for Chess/);
});
