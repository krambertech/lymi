import { expect, type Locator, type Page, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

/**
 * A deck's sections open in order: the learner sees where they are without scrolling, reads what is
 * coming, starts the next section when it is ready or earlier if they choose, and the owner moves
 * cards between sections without losing anyone's progress.
 */

async function addSection(page: Page, deckId: string, name: string, terms: string[]) {
  const section = await page.request.post(`/api/decks/${deckId}/sections`, { data: { name } });
  expect(section.status()).toBe(201);
  const sectionId = ((await section.json()) as { id: string }).id;
  const cardIds: string[] = [];
  for (const term of terms) {
    const card = await page.request.post("/api/cards", {
      data: { deckId, sectionId, term, meaning: `meaning of ${term}`, language: "et" },
    });
    expect(card.status()).toBe(201);
    cardIds.push(((await card.json()) as { card: { id: string } }).card.id);
  }
  return cardIds;
}

function dialog(page: Page, title: string | RegExp): Locator {
  return page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: title }) });
}

test("a learner opens a deck's sections in order and the owner rearranges them", async ({
  page,
}, testInfo) => {
  await signInAsTestLearner(page, testInfo, "sections");
  const tag = testInfo.project.name;
  const deck = await page.request.post("/api/decks", {
    // Started by hand here, so the journey can show the ready moment; automatic has its own step.
    data: { name: `Eesti ${tag}`, defaultLanguage: "et", sectionProgression: "manual" },
  });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  const greetings = await addSection(page, deckId, "Greetings", ["tere", "aitäh"]);
  await addSection(page, deckId, "Numbers", ["üks"]);
  await addSection(page, deckId, "Food", ["leib"]);

  const today = page.getByRole("region", { name: "Today", exact: true });
  const heading = (name: string) =>
    page.getByRole("heading", { level: 2, name: new RegExp(`^${name}`) });
  const row = (term: string) =>
    page.getByRole("listitem").getByRole("button").filter({ hasText: term });

  await test.step("only the first section is in review, and the rest can be read", async () => {
    await page.goto(`/library/${deckId}`);
    await expect(today).toContainText(/2\s*cards to review now/);
    await expect(today).toContainText("Numbers opens when you know 2 of 2 cards.");
    await expect(heading("Greetings")).toBeVisible();
    await expect(heading("Numbers")).toHaveAccessibleName(/not open yet/);
    await expect(row("leib")).toContainText("Not in review yet");
    await expect(page.getByRole("button", { name: "Start anyway", exact: true })).toHaveCount(2);
  });

  await test.step("knowing the first section makes the next one ready, and Start opens it", async () => {
    for (const cardId of greetings) {
      const graded = await page.request.post("/api/review/grade", {
        data: { cardId, mode: { cue: "term", target: "meaning" }, rating: 4 },
      });
      expect(graded.ok()).toBeTruthy();
    }
    await page.reload();
    await expect(today).toContainText("Numbers is ready");
    await today.getByRole("button", { name: "Start Numbers", exact: true }).click();
    await expect(page.getByText("Started Numbers", { exact: true })).toBeVisible();
    await expect(today).toContainText(/1\s*card to review now/);
    await expect(today).toContainText("Food opens when you know 1 of 1 card.");

    // A retry from another device changes nothing.
    await page.reload();
    await expect(today).toContainText("Food opens when you know 1 of 1 card.");
  });

  await test.step("Go to finds the current section in a long list", async () => {
    await today.getByRole("button", { name: "Go to Numbers", exact: true }).click();
    await expect(heading("Numbers")).toBeFocused();
    await expect(page.getByText("You are here", { exact: true })).toBeVisible();
  });

  await test.step("Start anyway opens a later section early", async () => {
    await page.getByRole("button", { name: "Start anyway", exact: true }).click();
    await expect(page.getByText("Started Food", { exact: true })).toBeVisible();
    await expect(today).toContainText("Every section is open");
    await expect(page.getByRole("button", { name: "Start anyway", exact: true })).toHaveCount(0);
  });

  await test.step("the owner makes a section and moves cards into it", async () => {
    await page
      .getByRole("button", { name: "Deck options", exact: true })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "New section", exact: true }).click();
    const naming = dialog(page, "New section");
    await naming.getByRole("button", { name: "Create section", exact: true }).click();
    await expect(naming.getByText("Give the section a name.")).toBeVisible();
    await naming.getByRole("textbox", { name: "Name", exact: true }).fill("Review");
    await naming.getByRole("button", { name: "Create section", exact: true }).click();
    await expect(naming).toBeHidden();
    await expect(heading("Review")).toBeVisible();

    await page
      .getByRole("button", { name: "Deck options", exact: true })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Select cards", exact: true }).click();
    await row("tere").click();
    await row("leib").click();
    const bar = page.getByRole("region", { name: "Selected cards", exact: true });
    await expect(bar).toContainText("2 selected");
    await bar.getByRole("button", { name: "Move to section…", exact: true }).click();
    const picker = dialog(page, "Move 2 cards to");
    await picker.getByRole("button", { name: "Review", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(page.getByText("Moved 2 cards to Review", { exact: true })).toBeVisible();
    await expect(heading("Review")).toHaveAccessibleName(/, 2$/);

    // Moving never touches a schedule: the Known card is still Known after a reload.
    await page.reload();
    await expect(row("tere")).toContainText("Known");
    await expect(heading("Greetings")).toHaveAccessibleName(/, 1$/);
  });

  await test.step("the owner reorders sections in deck settings", async () => {
    await page.getByRole("button", { name: "Options for Review", exact: true }).click();
    await page.getByRole("menuitem", { name: "Arrange sections", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Deck settings", exact: true })).toBeVisible();
    const moveUp = page.getByRole("button", { name: "Move Review up", exact: true });
    const manager = page.getByRole("list").filter({ has: moveUp });
    await moveUp.click();
    await expect(manager.getByRole("listitem")).toHaveText([
      /Greetings/,
      /Numbers/,
      /Review/,
      /Food/,
    ]);

    // All at once leaves nothing to start.
    await page.getByRole("radio", { name: /All at once/ }).click();
    await expect(page.getByRole("radio", { name: /All at once/ })).toBeChecked();

    await page.goto(`/library/${deckId}`);
    await expect(today).not.toContainText("section");
    await expect(page.getByRole("button", { name: "Start anyway", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      /^Greetings/,
      /^Numbers/,
      /^Review/,
      /^Food/,
    ]);
  });

  await test.step("by default, knowing a section opens the next one by itself", async () => {
    const auto = await page.request.post("/api/decks", {
      data: { name: `Automatic ${tag}`, defaultLanguage: "et" },
    });
    expect(auto.ok()).toBeTruthy();
    const autoId = ((await auto.json()) as { id: string }).id;
    const [uno] = await addSection(page, autoId, "Uno", ["kolm"]);
    await addSection(page, autoId, "Due", ["neli"]);
    const graded = await page.request.post("/api/review/grade", {
      data: { cardId: uno, mode: { cue: "term", target: "meaning" }, rating: 4 },
    });
    expect(graded.ok()).toBeTruthy();

    await page.goto(`/library/${autoId}`);
    await expect(today).toContainText("Every section is open");
    await expect(heading("Due")).not.toHaveAccessibleName(/not open yet/);
    await expect(row("neli")).not.toContainText("Not in review yet");
  });
});
