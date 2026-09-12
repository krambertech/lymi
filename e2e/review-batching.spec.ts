import { expect, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

/** The server hands out at most this many cards per session. */
const BATCH = 50;

/**
 * A session is one batch, so a queue larger than the batch has a seam in it. This covers the seam:
 * pressing Keep going must not reopen a card the learner has already graded. React Query keeps
 * serving the finished batch until the next fetch lands, so an index reset that does not wait for
 * that fetch puts the fiftieth card back on screen, ready to be graded a second time.
 *
 * Chromium only. What is under test is the batch transition, not how it renders.
 */
test.describe("review batching", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "logic, not rendering");

  test("Keep going starts a new batch instead of replaying the finished one", async ({
    page,
  }, testInfo) => {
    test.slow();
    await signInAsTestLearner(page, testInfo, "review-batching");

    const deck = await page.request.post("/api/decks", {
      data: { name: "Batch deck", defaultLanguage: "it" },
    });
    expect(deck.ok()).toBeTruthy();
    const deckId = ((await deck.json()) as { id: string }).id;

    await test.step(`add ${BATCH + 1} cards, one more than a batch`, async () => {
      for (let i = 0; i < BATCH + 1; i++) {
        const card = await page.request.post("/api/cards", {
          data: {
            deckId,
            term: `parola${String(i).padStart(3, "0")}`,
            meaning: `meaning ${i}`,
            language: "it",
          },
        });
        expect(card.ok()).toBeTruthy();
      }
    });

    await page.goto("/review");
    await expect(page.getByText(`0 of ${BATCH}`)).toBeVisible();

    const graded: string[] = [];
    await test.step("grade the whole first batch", async () => {
      for (let i = 0; i < BATCH; i++) {
        const card = page.getByLabel(/card for /);
        const label = await card.getAttribute("aria-label");
        expect(label, `card ${i} should be on screen`).toBeTruthy();
        graded.push(label as string);

        await page.keyboard.press("Space");
        await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
        await page.keyboard.press("3");

        if (i < BATCH - 1) {
          await expect(page.getByLabel(/card for /)).not.toHaveAttribute(
            "aria-label",
            label as string,
          );
        }
      }
    });

    await expect(page.getByRole("heading", { name: "A good pause" })).toBeVisible();
    await expect(page.getByText("1 more is ready when you are")).toBeVisible();

    await test.step("the next batch is the card that did not fit, not a replay", async () => {
      await page.getByRole("button", { name: "Keep going" }).click();

      const next = page.getByLabel(/card for /);
      await expect(next).toBeVisible();
      const label = await next.getAttribute("aria-label");
      expect(graded, "the next batch must not reopen a graded card").not.toContain(label);
      await expect(page.getByText("0 of 1")).toBeVisible();
    });
  });
});
