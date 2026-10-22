import { startAsTestLearner } from "./auth";
import { expect, type Locator, test } from "./test";

/** An Arabic deck reads right to left in an English interface, and learner text never reorders it. */

const TERM = "كتاب PDF";
const EXAMPLE = "قرأتُ كتاب Harry Potter مرتين";

/** Where each run is drawn inside `within`, from its first occurrence in a text node. */
function boxes(within: Locator, runs: string[]) {
  return within.evaluate((root, runs) => {
    const find = (text: string) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.textContent?.indexOf(text) ?? -1;
        if (at < 0) continue;
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + text.length);
        const { left, right } = range.getBoundingClientRect();
        return { left, right };
      }
      throw new Error(`“${text}” is not drawn`);
    };
    return Object.fromEntries(runs.map((run) => [run, find(run)]));
  }, runs);
}

test("an Arabic card reads right to left on its cue, its answer and its archive toast", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "right-to-left");
  const deck = await page.request.post("/api/decks", {
    data: { name: `عربي ${testInfo.project.name}`, defaultLanguage: "ar" },
  });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  const added = await page.request.post("/api/cards", {
    data: {
      deckId,
      term: TERM,
      meaning: "book (as a PDF)",
      example: EXAMPLE,
      notes: "جمع: كُتُب",
      tags: ["مفردات"],
    },
  });
  expect(added.status(), await added.text()).toBe(201);

  await test.step("the deck's search turns right to left as Arabic is typed", async () => {
    await page.goto(`/library/${deckId}`);
    // A touch screen opens the search from a button in the bar; wait for the page before asking.
    await expect(page.getByRole("heading", { level: 1, name: /عربي/ })).toBeVisible();
    const opener = page.getByRole("button", { name: "Search this deck" });
    if (await opener.isVisible()) await opener.click();
    const search = page.getByRole("textbox", { name: "Search this deck" });
    await expect.poll(() => search.evaluate((el) => el.matches(":dir(ltr)"))).toBe(true);
    await search.fill("كتاب");
    await expect.poll(() => search.evaluate((el) => el.matches(":dir(rtl)"))).toBe(true);
  });

  await page.goto(`/review?deck=${deckId}`);
  const card = page.getByLabel(/^Recognition card for /);
  await expect(card).toBeVisible();

  await test.step("the cue runs right to left, the Latin word after the Arabic one", async () => {
    const cue = card.locator("p[lang=ar]").first();
    await expect(cue).toHaveAttribute("dir", "rtl");
    await expect(cue).toHaveCSS("direction", "rtl");
    const at = await boxes(cue, ["كتاب", "PDF"]);
    expect(at.كتاب.left).toBeGreaterThanOrEqual(at.PDF.right);
  });

  await page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });

  await test.step("the example keeps its English title in place and the meaning stays left to right", async () => {
    const example = page.locator("p[lang=ar]", { hasText: "Harry Potter" });
    await expect(example).toHaveCSS("direction", "rtl");
    const at = await boxes(example, ["قرأتُ", "Harry", "Potter", "مرتين"]);
    // Read from the right: قرأتُ first, the title as one left-to-right run, مرتين last.
    expect(at.قرأتُ.left).toBeGreaterThan(at.Potter.right);
    expect(at.Harry.right).toBeLessThan(at.Potter.left);
    expect(at.مرتين.right).toBeLessThanOrEqual(at.Harry.left);
    const meaning = page.getByText("book (as a PDF)", { exact: true });
    await expect(meaning).toHaveCSS("direction", "ltr");
  });

  await test.step("archiving says the term in its own order", async () => {
    await page.getByRole("button", { name: "Card options" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Archive card" }).click();
    const title = page.locator("[data-slot=toast-title]", { hasText: "Archived" });
    await expect(title).toBeVisible();
    await expect(title.locator("bdi")).toHaveText(TERM);
    const at = await boxes(title, ["Archived", "كتاب", "PDF"]);
    expect(at.Archived.right).toBeLessThan(at.PDF.left);
    expect(at.كتاب.left).toBeGreaterThanOrEqual(at.PDF.right);
  });
});
