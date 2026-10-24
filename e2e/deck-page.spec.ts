import { startAsTestLearner } from "./auth";
import { expect, type Page, test } from "./test";

async function addSection(page: Page, deckId: string, name: string) {
  const res = await page.request.post(`/api/decks/${deckId}/sections`, { data: { name } });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function addCard(
  page: Page,
  deckId: string,
  term: string,
  meaning: string,
  sectionId: string,
  tags: string[] = [],
) {
  const res = await page.request.post("/api/cards", {
    data: { deckId, term, meaning, sectionId, language: "et", tags },
  });
  expect(res.ok()).toBeTruthy();
}

/**
 * A deck reads as a glossary grouped by section. Filters narrow it and show as chips, a sort changes
 * the headings, and a word opens over the page or, in a window wide enough for both, beside it.
 */
test("a learner can filter, sort and open the words in a deck", async ({
  page,
  isMobile,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "deck-page");
  const row = (term: string) =>
    page.getByRole("listitem").getByRole("button").filter({ hasText: term });

  await test.step("read the words grouped by section, in the deck's order", async () => {
    const res = await page.request.post("/api/decks", {
      // Sections are open to everyone here, so this journey is only about reading the list.
      data: { name: "Eesti A1", defaultLanguage: "et", sectionProgression: "open" },
    });
    expect(res.ok()).toBeTruthy();
    const deckId = ((await res.json()) as { id: string }).id;
    const lesson4 = await addSection(page, deckId, "Lesson 4");
    const lesson5 = await addSection(page, deckId, "Lesson 5");
    await addCard(page, deckId, "leib · leiva · leiba", "bread", lesson4, ["food"]);
    await addCard(page, deckId, "piim", "milk", lesson4, ["food"]);
    await addCard(page, deckId, "õppima · õppida · õpin", "to study", lesson5);
    await page.goto(`/library/${deckId}`);

    await expect(page.getByRole("heading", { level: 1, name: "Eesti A1" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([/^Lesson 4/, /^Lesson 5/]);
    await expect(row("õppima")).toContainText("õppida · õpin");
  });

  await test.step("narrow the list by section and remove the filter from its chip", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitem", { name: "Section", exact: true }).click();
    // Each value says how many cards it keeps.
    await page.getByRole("menuitemcheckbox", { name: "Lesson 4 2", exact: true }).click();
    await page.keyboard.press("Escape");

    await expect(row("piim")).toBeVisible();
    await expect(row("õppima")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Remove filter: Section: Lesson 4", exact: true })
      .click();
    await expect(row("õppima")).toBeVisible();
  });

  await test.step("narrow the list by a tag", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitem", { name: "Tags", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "food 2", exact: true }).click();
    await page.keyboard.press("Escape");

    await expect(row("piim")).toBeVisible();
    await expect(row("õppima")).toHaveCount(0);
    await page.getByRole("button", { name: "Remove filter: Tags: food", exact: true }).click();
    await expect(row("õppima")).toBeVisible();
  });

  await test.step("put a tag on chosen cards at once", async () => {
    await page.getByRole("button", { name: "Deck options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Select cards", exact: true }).click();
    await row("õppima").click();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Tags…", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Tags for 1 card" });
    await dialog.getByRole("checkbox", { name: "food", exact: true }).click();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Changed the tags on 1 card", { exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await expect(page.getByRole("menuitemcheckbox", { name: "food 3", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await test.step("rename, archive and restore a tag from the deck's settings", async () => {
    await page.getByRole("button", { name: "Deck options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
    await page.getByRole("link", { name: /Manage/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Tags" })).toBeVisible();

    await page.getByRole("button", { name: "Options for food", exact: true }).click();
    await page.getByRole("menuitem", { name: "Rename…", exact: true }).click();
    const rename = page.getByRole("dialog", { name: "Rename “food”" });
    await rename.getByRole("textbox", { name: "Name", exact: true }).fill("meals");
    await rename.getByRole("button", { name: "Rename", exact: true }).click();
    await expect(page.getByText("Renamed “food” to “meals”", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Options for meals", exact: true }).click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    const archived = page.getByRole("region", { name: "Archived tags" });
    await expect(archived.getByText("meals", { exact: true })).toBeVisible();
    await archived.getByRole("button", { name: "Restore", exact: true }).click();
    await expect(archived).toHaveCount(0);

    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Deck settings" })).toBeVisible();
    // The back link and the rail's deck row both lead to the deck.
    await page.getByRole("link", { name: "Eesti A1", exact: true }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Eesti A1" })).toBeVisible();
  });

  await test.step("say so when no word matches, and clear back to the deck", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitem", { name: "State", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: /^Known/ }).click();
    // Back to the fields without leaving the menu, then into a second one.
    await page.getByRole("menuitem", { name: "Back to all filters", exact: true }).click();
    await page.getByRole("menuitem", { name: "Due", exact: true }).click();
    await page.getByRole("menuitemradio", { name: /^Today/ }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toBeVisible();

    await expect(page.getByText("No cards match these filters", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Show all", exact: true }).click();
    await expect(row("piim")).toBeVisible();
  });

  await test.step("sort A–Z as one list without section headings", async () => {
    await page.getByRole("button", { name: "Sort: Section", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "A–Z", exact: true }).click();

    await expect(page.getByRole("button", { name: "Sort: A–Z", exact: true })).toBeVisible();
    // A toast's title is a heading too, and the rename's may still be up.
    await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(0);
  });

  if (isMobile) {
    await test.step("open a word as a drawer and close it with Escape", async () => {
      await row("piim").click();
      const word = page.getByRole("dialog", { name: "piim" });
      await expect(word).toBeVisible();
      await expect(page).toHaveURL(/\?card=/);
      await page.keyboard.press("Escape");
      await expect(word).toBeHidden();
      await expect(page).not.toHaveURL(/\?card=/);
    });
  } else {
    await test.step("in a laptop window, open a word beside the list and walk to the next", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await row("leib").click();
      await expect(
        page.getByRole("heading", { level: 1, name: "leib · leiva · leiba" }),
      ).toBeVisible();
      // The rename's toast is a dialog too and may still be up, so only the card's own sheet counts.
      await expect(page.getByRole("dialog", { name: "leib · leiva · leiba" })).toHaveCount(0);
      await page.keyboard.press("j");
      await expect(
        page.getByRole("heading", { level: 1, name: "õppima · õppida · õpin" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page).not.toHaveURL(/\?card=/);
    });

    await test.step("in a narrower window, open a word as a sheet over the page", async () => {
      await page.setViewportSize({ width: 1100, height: 800 });
      await row("piim").click();
      const word = page.getByRole("dialog", { name: "piim" });
      await expect(word).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: "piim" })).toBeFocused();

      // Escape closes the card form and leaves the card open under it.
      await word.getByRole("button", { name: "Edit card", exact: true }).click();
      const edit = page.getByRole("dialog", { name: "Edit card", exact: true });
      await edit.getByRole("textbox", { name: "Meaning", exact: true }).fill("draft");
      await page.keyboard.press("Escape");
      await expect(edit).toBeHidden();
      await expect(word).toBeVisible();
      await expect(page).toHaveURL(/\?card=/);

      await page.keyboard.press("Escape");
      await expect(word).toBeHidden();
      await expect(page).not.toHaveURL(/\?card=/);
    });

    await test.step("move an open word between sheet and beside as the window resizes", async () => {
      await row("piim").click();
      await expect(page.getByRole("dialog", { name: "piim" })).toBeVisible();
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(page.getByRole("dialog", { name: "piim" })).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1, name: "piim" })).toBeVisible();
      await page.setViewportSize({ width: 1100, height: 800 });
      await expect(page.getByRole("dialog", { name: "piim" })).toBeVisible();
    });
  }
});

/**
 * A deck that cannot be drawn says so. One that is gone leads back to Library; one the app could
 * not reach offers Try again, and recovers on it. Issue #268.
 */
test("a learner sees why a deck could not be opened", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "deck-page");

  // Each request retries once before the screen gives up, so both messages land after the default wait.
  const settles = { timeout: 20_000 };

  await test.step("a deck id that is not there names the state and leads to Library", async () => {
    await page.goto("/library/no-such-deck");

    await expect(page.getByRole("heading", { name: "This deck is no longer here" })).toBeVisible(
      settles,
    );
    await page.getByRole("link", { name: "Open Library" }).click();
    await expect(page).toHaveURL(/\/library$/);
  });

  const res = await page.request.post("/api/decks", {
    data: { name: "Suomi A1", defaultLanguage: "fi" },
  });
  expect(res.ok()).toBeTruthy();
  const deckId = ((await res.json()) as { id: string }).id;

  await test.step("a real deck the app cannot reach recovers on Try again", async () => {
    await page.route(`**/api/decks/${deckId}/cards`, (route) =>
      route.abort("internetdisconnected"),
    );
    await page.goto(`/library/${deckId}`);
    await expect(page.getByRole("heading", { name: "Couldn’t load this deck" })).toBeVisible(
      settles,
    );

    await page.unroute(`**/api/decks/${deckId}/cards`);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Suomi A1" })).toBeVisible();
  });
});
