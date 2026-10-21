export const title = "Right-to-left cards";
export const persona = "fresh";
export const start = "/library";

const TERM = "كتاب PDF";
const MEANING = "book (as a PDF)";
const EXAMPLE = "قرأتُ كتاب Harry Potter مرتين";

export default async function drive({ page, base, step, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  // Where each run is drawn, since the DOM keeps the logical order whatever the screen shows.
  const boxes = (locator, runs) =>
    locator.evaluate((root, runs) => {
      const find = (text) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const at = node.textContent.indexOf(text);
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

  const deck = await post("/api/decks", {
    name: "عربي",
    defaultLanguage: "ar",
    directions: "recognition",
  });
  const { results } = await post("/api/cards/batch", {
    cards: [{ deckId: deck.id, term: TERM, meaning: MEANING, example: EXAMPLE, enrich: false }],
  });
  const card = results[0].card;

  await step("Search the deck in Arabic: the field turns right to left", async () => {
    await page.goto(`${base}/library/${deck.id}`);
    // A touch screen opens the search from a button in the bar; wait for the page before asking.
    await expect(page.getByRole("heading", { level: 1, name: /عربي/ })).toBeVisible();
    const opener = page.getByRole("button", { name: "Search this deck" });
    if (await opener.isVisible()) await opener.click();
    const search = page.getByRole("textbox", { name: "Search this deck" });
    expect(await search.evaluate((el) => el.matches(":dir(ltr)"))).toBe(true);
    await search.fill("كتاب");
    await expect.poll(() => search.evaluate((el) => el.matches(":dir(rtl)"))).toBe(true);
  });

  await step("Review the card: the cue runs right to left, كتاب before PDF", async () => {
    await page.goto(`${base}/review?deck=${deck.id}`);
    const cue = page
      .getByLabel(/^Recognition card for /)
      .locator("p[lang=ar]")
      .first();
    await expect(cue).toHaveAttribute("dir", "rtl");
    await expect(cue).toHaveCSS("direction", "rtl");
    const at = await boxes(cue, ["كتاب", "PDF"]);
    expect(at.كتاب.left).toBeGreaterThanOrEqual(at.PDF.right);
    return at;
  });

  await step(
    "Reveal it: the example reads from the right and the meaning from the left",
    async () => {
      await page
        .getByRole("button", { name: "Reveal the card" })
        .click({ position: { x: 24, y: 24 } });
      const example = page.locator("p[lang=ar]", { hasText: "Harry Potter" });
      await expect(example).toHaveCSS("direction", "rtl");
      const at = await boxes(example, ["قرأتُ", "Harry", "Potter", "مرتين"]);
      expect(at.قرأتُ.left).toBeGreaterThan(at.Potter.right);
      expect(at.Harry.right).toBeLessThan(at.Potter.left);
      expect(at.مرتين.right).toBeLessThanOrEqual(at.Harry.left);
      await expect(page.getByText(MEANING, { exact: true })).toHaveCSS("direction", "ltr");
      return at;
    },
  );

  await step("Archive it: the toast names the term in its own order", async () => {
    await page.getByRole("button", { name: "Card options" }).click();
    await page.getByRole("menuitem", { name: "Archive card" }).click();
    const title = page.locator("[data-slot=toast-title]", { hasText: "Archived" });
    await expect(title.locator("bdi")).toHaveText(TERM);
    const at = await boxes(title, ["Archived", "كتاب", "PDF"]);
    expect(at.Archived.right).toBeLessThan(at.PDF.left);
    expect(at.كتاب.left).toBeGreaterThanOrEqual(at.PDF.right);
    await expect
      .poll(async () => {
        const response = await page.request.get(
          `${base}/api/cards?query=${encodeURIComponent("كتاب")}&archived=true`,
        );
        const { cards } = await response.json();
        return cards.find((c) => c.id === card.id)?.archivedAt ?? null;
      })
      .not.toBeNull();
    return at;
  });
}
