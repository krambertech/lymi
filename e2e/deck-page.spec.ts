import { expect, type Page, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

async function addCard(page: Page, deckId: string, term: string, meaning: string, source: string) {
  const res = await page.request.post("/api/cards", {
    data: { deckId, term, meaning, source, language: "et" },
  });
  expect(res.ok()).toBeTruthy();
}

/**
 * A deck reads as a glossary grouped by lesson. Filters narrow it and show as chips, a sort changes
 * the headings, and a word opens over the page or, in a window wide enough for both, beside it.
 */
test("a learner can filter, sort and open the words in a deck", async ({
  page,
  isMobile,
}, testInfo) => {
  await signInAsTestLearner(page, testInfo, "deck-page");
  const row = (term: string) =>
    page.getByRole("listitem").getByRole("button").filter({ hasText: term });

  await test.step("read the words grouped by lesson, newest lesson first", async () => {
    const res = await page.request.post("/api/decks", {
      data: { name: "Eesti A1", defaultLanguage: "et" },
    });
    expect(res.ok()).toBeTruthy();
    const deckId = ((await res.json()) as { id: string }).id;
    await addCard(page, deckId, "leib · leiva · leiba", "bread", "Lesson 4");
    await addCard(page, deckId, "piim", "milk", "Lesson 4");
    await addCard(page, deckId, "õppima · õppida · õpin", "to study", "Lesson 5");
    await page.goto(`/library/${deckId}`);

    await expect(page.getByRole("heading", { level: 1, name: "Eesti A1" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([/^Lesson 5/, /^Lesson 4/]);
    await expect(row("õppima")).toContainText("õppida · õpin");
  });

  await test.step("narrow the list by lesson and remove the filter from its chip", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "Lesson 4", exact: true }).click();
    await page.keyboard.press("Escape");

    await expect(row("piim")).toBeVisible();
    await expect(row("õppima")).toHaveCount(0);
    await page.getByRole("button", { name: "Remove filter: Lesson 4", exact: true }).click();
    await expect(row("õppima")).toBeVisible();
  });

  await test.step("say so when no word matches, and clear back to the deck", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "Known", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "Due today", exact: true }).click();
    await expect(
      page.getByRole("menuitemradio", { name: "Any time", exact: true }),
    ).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("Escape");

    await expect(page.getByText("No cards match these filters", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Show all", exact: true }).click();
    await expect(row("piim")).toBeVisible();
  });

  await test.step("sort A–Z as one list without lesson headings", async () => {
    await page.getByRole("button", { name: "Sort: Lesson", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "A–Z", exact: true }).click();

    await expect(page.getByRole("button", { name: "Sort: A–Z", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
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
      await expect(page.getByRole("dialog")).toHaveCount(0);
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
