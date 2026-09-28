import { startAsTestLearner } from "./auth";
import { expect, type Locator, type Page, test } from "./test";

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

/** A parked offer fades and keeps its room until the grade, so it is transparent and inert, not gone. */
async function expectParked(offer: Locator) {
  await expect(offer).toHaveAttribute("inert", "");
  await expect(offer).toHaveCSS("opacity", "0");
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
    await expectParked(offer);
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

test("Not now parks the offer: it leaves the card, and the answer stays put", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-fix", "/today");
  const deckId = await seedPair(page);
  await page.goto(`/review?deck=${deckId}`);
  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  const offer = page.getByRole("button", { name: /Often mixed up with algama/ });
  const answer = page.getByLabel(/ card for /).getByText(/^alustama/);
  await expect(offer).not.toHaveAttribute("inert");
  const before = await answer.boundingBox();
  await offer.click();
  const sheet = page.getByRole("dialog", { name: "alustama and algama" });
  await sheet.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(sheet).toBeHidden();
  await expectParked(offer);
  // The offer that opened the sheet is inert now, so focus lands on the grades.
  await expect(page.getByRole("group", { name: "Choose a recall grade" })).toBeFocused();
  expect((await answer.boundingBox())?.y).toBe(before?.y);
});

test("a tap where the offer will be, before it has arrived, opens nothing", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-fix", "/today");
  const deckId = await seedPair(page);
  await page.goto(`/review?deck=${deckId}`);
  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  // Still transparent and inert, but its room is already there to be tapped.
  const offer = page.locator("[aria-haspopup=dialog]");
  await expect(offer).toHaveAttribute("inert", "");
  const box = await offer.boundingBox();
  if (!box) throw new Error("the offer has no room");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(offer).not.toHaveAttribute("inert");
  await expect(page.getByRole("dialog", { name: "alustama and algama" })).toBeHidden();
});

test("“That’s not it” sets the fix aside for good, and Undo brings the offer back", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "review-fix", "/today");
  const deckId = await seedPair(page);
  const cards = await page.request.get(`/api/decks/${deckId}/cards`);
  const rows = (await cards.json()) as { card: { id: string; term: string } }[];
  const cardId = rows.find((row) => row.card.term === "alustama")?.card.id;
  const dismissed = async () => {
    const res = await page.request.get(`/api/cards/${cardId}`);
    return ((await res.json()) as { diagnosis: { dismissedAt: string | null } }).diagnosis
      .dismissedAt;
  };
  await page.goto(`/review?deck=${deckId}`);
  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  const offer = page.getByRole("button", { name: /Often mixed up with algama/ });

  await test.step("the learner says the cause is wrong, and the offer leaves", async () => {
    await offer.click();
    const sheet = page.getByRole("dialog", { name: "alustama and algama" });
    await sheet.getByRole("button", { name: "That’s not it", exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByText("Lymi won’t offer this fix again")).toBeVisible();
    await expectParked(offer);
    await expect.poll(dismissed).not.toBeNull();
  });

  await test.step("Undo takes the answer back and returns the offer to the card", async () => {
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect.poll(dismissed).toBeNull();
    await expect(offer).not.toHaveAttribute("inert");
    await expect(offer).toBeVisible();
  });
});
