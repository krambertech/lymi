import { signInAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

/** A card at every field limit stays readable and gradable on a small phone and a wide desktop. */

const atLimit = (sentence: string, length: number) =>
  sentence.repeat(Math.ceil(length / sentence.length)).slice(0, length);

const TERM = atLimit("Die Wendung beschreibt jemanden, der zu spät handelt. ", 500);
const NOTES = atLimit("Notes at the limit scroll inside the card. ", 2000);

async function pageHoldsStill(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    )
    .toBe(true);
}

test("a learner can read and grade a card at every field limit on any screen", async ({
  page,
}, testInfo) => {
  await signInAsTestLearner(page, testInfo, "long-cards");
  const deck = await page.request.post("/api/decks", {
    data: { name: `Long cards ${testInfo.project.name}`, defaultLanguage: "de" },
  });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;

  await test.step("meaning and example take up to 2000 characters", async () => {
    const tooLong = await page.request.post("/api/cards", {
      data: { deckId, term: "zu lang", meaning: "a".repeat(2001) },
    });
    expect(tooLong.status()).toBe(400);

    const added = await page.request.post("/api/cards", {
      data: {
        deckId,
        term: TERM,
        meaning: atLimit("A meaning as long as the field allows. ", 2000),
        example: atLimit("Er kam zu spät und sagte, es sei Absicht gewesen. ", 2000),
        notes: NOTES,
        pronunciation: atLimit("ˈvɛndʊŋ ", 200),
        source: atLimit("Grammatik aktiv, Kapitel 12 ", 200),
      },
    });
    expect(added.status(), await added.text()).toBe(201);
  });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await test.step(`grades stay on screen at ${viewport.width}×${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/review");
      await expect(page.getByLabel(/^Recognition card for /)).toBeVisible();
      await page
        .getByRole("button", { name: "Reveal the card" })
        .click({ position: { x: 24, y: 24 } });

      for (const grade of [/^Forgot/, /^Hard/, /^Good/, /^Easy/]) {
        await expect(page.getByRole("button", { name: grade })).toBeInViewport({ ratio: 1 });
      }
      await pageHoldsStill(page);

      const notes = page.getByText(NOTES.trim(), { exact: true });
      await notes.scrollIntoViewIfNeeded();
      await expect(notes).toBeInViewport();
      await expect(page.getByRole("button", { name: /^Good/ })).toBeInViewport({ ratio: 1 });
      await pageHoldsStill(page);
    });
  }

  await test.step("the deck list shows a few lines of the card", async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/library/${deckId}`);
    const row = page.getByRole("button", { name: /Die Wendung beschreibt/ });
    await expect(row).toBeVisible();
    const box = await row.boundingBox();
    expect(box?.height).toBeLessThan(200);
  });
});
