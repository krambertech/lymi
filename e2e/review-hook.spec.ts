import type { ElementHandle } from "@playwright/test";
import { startAsTestLearner } from "./auth";
import { expect, type Locator, type Page, test } from "./test";

// A journey because a peek is held by the page and sent with the grade: it has to survive the
// grade outbox and a reload, and reach D1 with the review. The rules are route and service tests,
// and taps timed against the motion are component tests. Every test here signs in as the same
// account, one per file, so each seeds a deck of its own.

const WHY = "You can’t choose Easy after peeking at your hook.";

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

/** Where an element is drawn, failing the test rather than measuring nothing. */
async function box(locator: Locator) {
  const drawn = await locator.boundingBox();
  expect(drawn, "the element has no box").not.toBeNull();
  if (!drawn) throw new Error("unreachable");
  return drawn;
}

const history = async (page: Page, cardId: string) =>
  (await (await page.request.get(`/api/cards/${cardId}/history`)).json()) as History;

/** How far the hook's line sits below the cue's first line, which the reveal must not change. */
const hookOffset = (hook: ElementHandle<Element>, cue: ElementHandle<Element>) =>
  hook.evaluate((line, word) => {
    const top = (el: Element) => el.getBoundingClientRect().top;
    return { connected: line.isConnected, offset: Math.round(top(line) - top(word as Element)) };
  }, cue);

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

  await test.step("the reveal leaves the hook in its place under the cue", async () => {
    const hook = await card
      .getByRole("paragraph")
      .filter({ hasText: "Fresh snow makes the street luminous." })
      .elementHandle();
    // The cue ends in a word joiner that keeps its pronunciation button on its line.
    const cue = await card.getByText(/^lumi\u2060?$/).elementHandle();
    if (!hook || !cue) throw new Error("no hook or cue on the card");
    const before = await hookOffset(hook, cue);
    // A tap on the card this soon after the peek would be taken as a doubled tap, so a key reveals.
    await page.keyboard.press("Space");
    await expect(grades).toBeVisible();
    // The same line, not a new one among the notes, and as far below the cue as it was.
    expect(await hookOffset(hook, cue)).toEqual({ ...before, connected: true });
    await expect(
      card.getByRole("paragraph").filter({ hasText: "Fresh snow makes the street luminous." }),
    ).toHaveCount(1);
    await expect(card.getByRole("button", { name: /Show hook/ })).toHaveCount(0);
  });

  await test.step("after the reveal Easy is locked: a tap or its key says why and grades nothing", async () => {
    const easy = grades.getByRole("button", { name: "Easy, locked" });
    await expect(easy).toHaveAttribute("aria-disabled", "true");
    await expect(easy).toHaveAccessibleDescription(WHY);
    // The tip itself is hidden from assistive technology; what it says is read out while it shows.
    const tip = page.getByRole("status").filter({ hasText: WHY });
    await easy.click({ force: true });
    await expect(tip).toHaveCount(1);
    // The click hands focus back to the grades, so their keys still reach the review.
    await expect(grades).toBeFocused();
    // Any key closes the tip; Easy's key opens it again.
    await page.keyboard.press("Shift");
    await expect(tip).toHaveCount(0);
    await page.keyboard.press("4");
    await expect(tip).toHaveCount(1);
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

test("revealed without a peek, Show hook puts the hook under the cue and leaves Easy open", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-hook");
  const { deckId, cardId } = await cardWithHook(page, "härm", "Frost is harmful to roses.");
  await page.goto(`/review?deck=${deckId}`);
  const card = page.getByLabel("Recognition card for härm", { exact: true });
  const grades = page.getByRole("group", { name: "Choose a recall grade" });
  const hook = card.getByRole("paragraph").filter({ hasText: "Frost is harmful to roses." });
  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  await expect(grades).toBeVisible();
  await expect(hook).toHaveCount(0);

  const show = card.getByRole("button", { name: /Show hook/ });
  await show.click();
  await expect(hook).toBeVisible();
  await expect(card.getByRole("status")).toHaveText("Memory hook: Frost is harmful to roses.");
  await expect(show).toHaveCount(0);
  // Under the cue, above the answer the reveal brought.
  const hookBox = await box(hook);
  const cueBox = await box(card.getByText(/^härm\u2060?$/));
  const answerBox = await box(card.getByText("snow", { exact: true }));
  expect(hookBox.y).toBeGreaterThan(cueBox.y);
  expect(hookBox.y).toBeLessThan(answerBox.y);

  // Seeing the hook with the answer out is not help with recall, so Easy stays and records nothing.
  const graded = page.waitForRequest((r) => r.url().endsWith("/api/review/grade"));
  await grades.getByRole("button", { name: /^Easy/ }).click();
  expect((await graded).postDataJSON()).not.toHaveProperty("aid");
  await expect
    .poll(async () => (await history(page, cardId)).reviews)
    .toEqual([expect.objectContaining({ rating: 4, aid: null })]);
});

test("H on the focused peek shows the hook and hands focus to the card", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-hook");
  const { deckId } = await cardWithHook(page, "vihm", "Rain drums on a van.");
  await page.goto(`/review?deck=${deckId}`);
  const peek = page.getByRole("button", { name: /Peek at your hook/ });
  await peek.focus();
  await page.keyboard.press("h");
  await expect(
    page.getByRole("paragraph").filter({ hasText: "Rain drums on a van." }),
  ).toBeVisible();
  // The spent peek is inert, so the card takes focus and Space reveals it.
  await expect(page.getByRole("button", { name: "Reveal the card" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("group", { name: "Choose a recall grade" })).toBeVisible();
});

test("H shows the hook after the reveal at once", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-hook");
  const { deckId } = await cardWithHook(page, "kask", "A birch in a cask.");
  await page.goto(`/review?deck=${deckId}`);
  await expect(page.getByRole("button", { name: "Reveal the card" })).toBeVisible();
  await page.keyboard.press("Space");
  const grades = page.getByRole("group", { name: "Choose a recall grade" });
  await expect(grades.getByRole("button", { name: /^Easy/ })).toBeVisible();
  await page.keyboard.press("h");
  await expect(page.getByRole("paragraph").filter({ hasText: "A birch in a cask." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Show hook/ })).toHaveCount(0);
  await expect(grades.getByRole("button", { name: "Easy, locked" })).toHaveCount(0);
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
    const drafted = page.getByRole("button", { name: /Try a memory hook/ });
    const unclear = page.getByRole("button", { name: /Often forgotten/ });
    await expect(drafted.or(unclear)).toBeVisible();

    if (await drafted.isVisible()) {
      await test.step("the drafted hook is kept as the AI's, and Undo takes it off", async () => {
        await drafted.click();
        const sheet = page.getByRole("dialog", { name: "A memory hook for kõrvits" });
        await expect(sheet.getByRole("textbox", { name: "Memory hook" })).toHaveValue(
          "A pumpkin curves at its sides: “curve-its”.",
        );
        await sheet.getByRole("button", { name: "Add hook" }).click();
        await expect(sheet).toBeHidden();
        // The menu's hook may have left its own toast, so this one is the newest.
        await expect(page.getByText("Hook added").last()).toBeVisible();
        // Kept after the reveal, it shows at once under the cue: the learner has just read it.
        const answer = page.getByLabel("Production card for pumpkin", { exact: true });
        // The card also holds a hidden copy of the hook that sizes it; this is the one on show.
        await expect(answer.getByText("AI hook").filter({ visible: true })).toBeVisible();
        await expect(answer.getByRole("button", { name: /Show hook/ })).toHaveCount(0);
        await page.getByRole("button", { name: "Undo", exact: true }).last().click();
        await expect(answer.getByRole("paragraph").filter({ hasText: /curve-its/ })).toHaveCount(0);
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
        await written.getByRole("button", { name: "Save hook" }).click();
        await expect(written).toBeHidden();
        const answer = page.getByLabel("Production card for to look, to watch", { exact: true });
        await expect(
          answer.getByRole("paragraph").filter({ hasText: "Watch the vat boil" }),
        ).toBeVisible();
        await expect(answer.getByText("AI hook")).toBeHidden();
      });
    }
    await good();
  }
});
