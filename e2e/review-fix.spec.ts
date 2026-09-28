import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

// A journey because it adds a drawer to review: the offer, the drawer on touch and WebKit, the
// write, and Undo across the Worker and D1. No public route writes a diagnosis without a model,
// so the setup is the local-only `/api/dev/fixes`, which the E2E server's loopback origin serves.

async function seedPair(page: Page) {
  const seeded = await page.request.post("/api/dev/fixes", {
    data: { causes: ["confused_pair"] },
  });
  expect(seeded.ok()).toBeTruthy();
  return ((await seeded.json()) as { deckId: string }).deckId;
}

const activeTerms = async (page: Page, deckId: string) => {
  const res = await page.request.get(`/api/decks/${deckId}/cards`);
  const rows = (await res.json()) as { card: { term: string; archivedAt: string | null } }[];
  return rows
    .filter((row) => !row.card.archivedAt)
    .map((row) => row.card.term)
    .sort();
};

test("a learner accepts a drafted fix after the reveal and can undo it", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-fix", "/today");
  const deckId = await seedPair(page);
  await page.goto(`/review?deck=${deckId}`);

  const offer = page.getByRole("button", { name: /Often mixed up with algama/ });
  await test.step("the offer waits for the reveal and never covers the grades", async () => {
    await expect(page.getByLabel(/ card for /)).toBeVisible();
    await expect(offer).toBeHidden();
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(offer).toBeVisible();
    await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
  });

  await test.step("the fix opens as a sheet and adds the two drafted cards", async () => {
    await offer.click();
    const sheet = page.getByRole("dialog", { name: "alustama and algama" });
    await expect(sheet.getByRole("heading", { name: "alustama and algama" })).toBeVisible();
    await sheet.getByRole("button", { name: "Add 2 cards", exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("Added 2 cards")).toBeVisible();
    await expect
      .poll(() => activeTerms(page, deckId))
      .toEqual(["Ma alustan tööd kell üheksa.", "Töö algab kell üheksa.", "algama", "alustama"]);
    await expect(offer).toBeHidden();
  });

  await test.step("Undo archives exactly the cards the fix added", async () => {
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect.poll(() => activeTerms(page, deckId)).toEqual(["algama", "alustama"]);
  });

  await test.step("review offers a fix once, so a reload does not bring it back", async () => {
    await page.reload();
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
    await expect(offer).toBeHidden();
  });
});

test("grading without opening the offer parks it", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-fix", "/today");
  const deckId = await seedPair(page);
  await page.goto(`/review?deck=${deckId}`);
  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  await expect(page.getByRole("button", { name: /Often mixed up with algama/ })).toBeVisible();
  await page.getByRole("button", { name: /^Good/ }).click();

  // Shown is offered: the draw no longer carries it, and it waits for the Often forgotten list.
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/review/draw?deck=${deckId}&tz=UTC`);
      const draw = (await res.json()) as { cards: { offer?: unknown }[] };
      return draw.cards.some((card) => card.offer);
    })
    .toBe(false);
});
