import { expect, type Locator, type Page, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

function sheet(page: Page, title: string): Locator {
  return page.locator('[role="dialog"], dialog').filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

function deckLink(page: Page, name: string): Locator {
  return page
    .locator("main")
    .getByRole("link")
    .filter({ has: page.getByText(name, { exact: true }) });
}

/**
 * Capture is one control, but it changes address with the layout: the rail holds it on a
 * desktop and the page header on a phone. The test asks for the one that is on screen, which
 * is what the learner reaches for, rather than pinning it to either container.
 */
function addMenu(page: Page) {
  return page.getByRole("button", { name: "Add", exact: true }).filter({ visible: true });
}

async function waitForLibrary(page: Page) {
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  await expect(page.getByText(/^\d+ decks? · \d+ cards?$/)).toBeVisible();
}

/**
 * The empty state can be on screen from cache while a just-created deck is refetched, and
 * Library's summary line reads the same shape warm or stale, so a helper that branched on the
 * empty state raced the first render. Capture is on every Library screen, empty or not, so the
 * helper takes that one road; the empty state has its own check below.
 */
async function openNewDeck(page: Page) {
  await page.goto("/library");
  await waitForLibrary(page);
  await addMenu(page).click();
  await page.getByRole("menuitem", { name: "New deck", exact: true }).click();

  const dialog = sheet(page, "New deck");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function createDeck(page: Page, name: string) {
  const dialog = await openNewDeck(page);
  await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Create deck", exact: true }).click();
  await expect(page).toHaveURL(/\/library\/[^/]+$/);
  await expect(page.getByRole("heading", { name: name.trim(), exact: true })).toBeVisible();

  const id = new URL(page.url()).pathname.match(/^\/library\/([^/]+)$/)?.[1];
  if (!id) throw new Error(`Created deck has an invalid destination: ${page.url()}`);
  return id;
}

test.describe("deck and card creation", () => {
  test("validates, creates, opens, and persists a deck", async ({ page }, testInfo) => {
    await signInAsTestLearner(page, testInfo, "deck-validation");
    await page.goto("/library");
    await waitForLibrary(page);

    // Nothing here yet, so the empty state is the way in.
    await page.locator("main").getByRole("button", { name: "New deck", exact: true }).click();
    await expect(sheet(page, "New deck")).toBeVisible();
    await sheet(page, "New deck").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(sheet(page, "New deck")).toBeHidden();

    await page.keyboard.press("n");
    const addCard = sheet(page, "Add a card");
    await expect(addCard).toBeVisible();
    await expect(addCard.getByText("A card lands in a deck.", { exact: false })).toBeVisible();
    await addCard.getByRole("button", { name: "New deck", exact: true }).click();

    let dialog = sheet(page, "New deck");
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole("textbox", { name: "Name", exact: true });
    const submit = dialog.getByRole("button", { name: "Create deck", exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(dialog.getByRole("alert")).toHaveText("Give the deck a name.");
    await expect(input).toBeFocused();
    await input.fill("Abandoned deck");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

    dialog = await openNewDeck(page);
    const emptyInput = dialog.getByRole("textbox", { name: "Name", exact: true });
    await expect(emptyInput).toHaveValue("");
    await emptyInput.fill("   ");
    await emptyInput.press("Enter");
    await expect(dialog.getByRole("alert")).toHaveText("Give the deck a name.");

    const name = `Italian lesson ${testInfo.project.name}`;
    await emptyInput.fill(`  ${name}  `);
    await dialog.getByRole("button", { name: "Create deck", exact: true }).click();
    await expect(page).toHaveURL(/\/library\/[^/]+$/);
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByText("0 cards", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Empty deck", exact: true })).toBeVisible();

    await page.goto("/library");
    await waitForLibrary(page);
    await page.reload();
    await waitForLibrary(page);
    const link = deckLink(page, name);
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/library\/[^/]+$/);
    await link.click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  });

  test("targets the current deck, resets capture, and skips a duplicate", async ({
    page,
  }, testInfo) => {
    await signInAsTestLearner(page, testInfo, "card-selection");

    const firstName = `First ${testInfo.project.name}`;
    const secondName = `Second ${testInfo.project.name}`;
    const term = "affrettarsi";
    const firstId = await createDeck(page, firstName);
    await createDeck(page, secondName);

    const addWord = page.locator("header").getByRole("button", { name: /^Add card/ });
    await addWord.click();
    let dialog = sheet(page, "Add a card");
    await expect(dialog.getByRole("combobox", { name: "Deck", exact: true })).toHaveText(
      secondName,
    );

    await dialog.getByRole("button", { name: `Add to ${secondName}`, exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Type the term.");
    await expect(dialog.getByRole("textbox", { name: "Term", exact: true })).toBeFocused();

    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill(term);
    await dialog.getByRole("textbox", { name: "Meaning", exact: true }).fill("to hurry up");
    await dialog.getByRole("button", { name: `Add to ${secondName}`, exact: true }).click();
    await expect(dialog.getByRole("status")).toHaveText(`Added “${term}”`);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

    await expect(page.getByText(term, { exact: true })).toBeVisible();
    await expect(page.getByText("to hurry up", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(term, { exact: true })).toBeVisible();

    await page.goto("/library");
    await waitForLibrary(page);
    await deckLink(page, firstName).click();
    await expect(page).toHaveURL(new RegExp(`/library/${firstId}$`));

    await page.keyboard.press("n");
    dialog = sheet(page, "Add a card");
    await expect(dialog.getByRole("combobox", { name: "Deck", exact: true })).toHaveText(firstName);
    await expect(dialog.getByRole("textbox", { name: "Term", exact: true })).toHaveValue("");
    await dialog.getByRole("textbox", { name: "Term", exact: true }).press("Escape");
    await expect(dialog).toBeHidden();

    await page
      .locator("header")
      .getByRole("button", { name: /^Add card/ })
      .click();
    dialog = sheet(page, "Add a card");
    await expect(dialog.getByRole("combobox", { name: "Deck", exact: true })).toHaveText(firstName);
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill(term);
    await dialog.getByRole("button", { name: `Add to ${firstName}`, exact: true }).click();
    await expect(dialog.getByRole("status")).toHaveText(`${term} is already in ${secondName}`);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Empty deck", exact: true })).toBeVisible();
  });

  test("adds a card when the optional meaning is blank", async ({ page }, testInfo) => {
    await signInAsTestLearner(page, testInfo, "optional-meaning");
    const name = `Optional meaning ${testInfo.project.name}`;
    await createDeck(page, name);

    await page
      .locator("header")
      .getByRole("button", { name: /^Add card/ })
      .click();
    const dialog = sheet(page, "Add a card");
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill("pazienza");
    await dialog.getByRole("button", { name: `Add to ${name}`, exact: true }).click();
    await expect(dialog.getByRole("status")).toHaveText("Added “pazienza”");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

    const cardRow = page.getByRole("button").filter({
      has: page.getByText("pazienza", { exact: true }),
    });
    await expect(cardRow).toBeVisible();
    await expect(cardRow).toContainText("No meaning yet");
  });

  test("rejects card creation into an archived deck", async ({ page }, testInfo) => {
    await signInAsTestLearner(page, testInfo, "archived-deck");
    const deckId = await createDeck(page, `Archived ${testInfo.project.name}`);

    await page.getByRole("button", { name: "Deck options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Archive deck", exact: true }).click();
    await expect(page).toHaveURL(/\/library\?archived=/);

    const response = await page.request.post("/api/cards", {
      data: { deckId, term: "inaccessibile" },
    });
    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "Deck not found" });
  });

  test("keeps creation controls reachable from 320px to wide desktop", async ({
    page,
  }, testInfo) => {
    await signInAsTestLearner(page, testInfo, "responsive-creation");
    const name = `Long ${testInfo.project.name} ${"learning ".repeat(12)}`.slice(0, 80).trim();
    const deckId = await createDeck(page, name);

    for (const viewport of [
      { width: 320, height: 568 },
      { width: 393, height: 852 },
      { width: 768, height: 700 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/library");
      await waitForLibrary(page);
      await expect(deckLink(page, name)).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);

      await addMenu(page).click();
      await page.getByRole("menuitem", { name: "New deck", exact: true }).click();
      const newDeck = sheet(page, "New deck");
      await expect(newDeck).toBeVisible();
      const deckName = newDeck.getByRole("textbox", { name: "Name", exact: true });
      await expect(newDeck.getByRole("button", { name: "Create deck", exact: true })).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (viewport.width < 768) {
        const fontSize = await deckName.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        );
        expect(fontSize).toBeGreaterThanOrEqual(16);
      }
      await page.keyboard.press("Escape");
      await expect(newDeck).toBeHidden();

      await page.goto(`/library/${deckId}`);
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      const addWord = page.locator("header").getByRole("button", { name: /^Add card/ });
      await addWord.click();
      const addCard = sheet(page, "Add a card");
      await expect(addCard).toBeVisible();
      const term = addCard.getByRole("textbox", { name: "Term", exact: true });
      await expect(addCard.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
      await expect(
        addCard.getByRole("button", { name: `Add to ${name}`, exact: true }),
      ).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (viewport.width < 768) {
        const fontSize = await term.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        );
        expect(fontSize).toBeGreaterThanOrEqual(16);
      }
      await page.keyboard.press("Escape");
      await expect(addCard).toBeHidden();
    }
  });
});
