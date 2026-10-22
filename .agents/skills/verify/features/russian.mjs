export const title = "Russian cards";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, api, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const deck = (name) =>
    post("/api/decks", { name, defaultLanguage: "ru", directions: "recognition" });
  // The cue's term, outside the hidden copy that sizes the card.
  const cue = () =>
    page
      .getByRole("region", { name: /Recognition card/ })
      .locator("p[lang='ru']")
      .filter({ visible: true })
      .first()
      // The speaker joins the last word with U+2060, which is no part of the term.
      .evaluate((el) => el.textContent.replaceAll("\u2060", "").trim());
  const reveal = () =>
    page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  let words;

  await step(
    "Add замок stressed за́мок and замо́к: two cards, and an unmarked add is skipped",
    async () => {
      words = await deck("Слова");
      const { results } = await post("/api/cards/batch", {
        cards: [
          {
            deckId: words.id,
            term: "замок",
            meaning: "a castle",
            pronunciation: "за́мок",
            enrich: false,
          },
          // A Latin ó, as a keyboard without Cyrillic marks types it.
          {
            deckId: words.id,
            term: "замок",
            meaning: "a lock",
            pronunciation: "замóк",
            enrich: false,
          },
          { deckId: words.id, term: "замок", enrich: false },
          { deckId: words.id, term: "замок", pronunciation: "[zɐˈmok]", enrich: false },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "added", "skipped", "skipped"]);
      expect(results[1]).toMatchObject({
        card: { pronunciation: "замо́к" },
        normalized: ["pronunciation"],
      });
      return { results };
    },
  );

  await step(
    "A stressed term splits into the term and its stress, and a second stress is a second card",
    async () => {
      const { results } = await post("/api/cards/batch", {
        cards: [
          { deckId: words.id, term: "пла́чу", meaning: "I cry", enrich: false },
          { deckId: words.id, term: "плачу́", meaning: "I pay", enrich: false },
          { deckId: words.id, term: "плачу", enrich: false },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "added", "skipped"]);
      expect(results[0]).toMatchObject({
        card: { term: "плачу", normalizedTerm: "плачу", pronunciation: "пла́чу" },
        normalized: ["term", "pronunciation"],
      });
      const { cards } = await api(`/api/cards?term=${encodeURIComponent("пла́чу")}`);
      expect(cards.map((card) => card.pronunciation).sort()).toEqual(["пла́чу", "плачу́"].sort());
      return { results, cards };
    },
  );

  await step("Search for the marked form finds both plain terms", async () => {
    const { cards } = await api(`/api/cards?query=${encodeURIComponent("за́мок")}`);
    expect(cards.map((card) => card.pronunciation).sort()).toEqual(["за́мок", "замо́к"].sort());
    return { cards };
  });

  await step("A New card draws its stress in place on the cue and the answer", async () => {
    const lock = await deck("Замок");
    await post("/api/cards/batch", {
      cards: [
        { deckId: lock.id, term: "мука", meaning: "flour", pronunciation: "мука́", enrich: false },
      ],
    });
    await page.goto(`/review?deck=${lock.id}`);
    await expect.poll(cue).toBe("мука́");
    // No line outside the cue, the paragraph with the speaker, repeats the stress.
    const line = page
      .getByText("мука́", { exact: true })
      .filter({ visible: true })
      .and(page.locator(":not(.sr-only):not(p:has(button) *)"));
    await expect(line).toHaveCount(0);
    await reveal();
    await expect(page.getByText("flour", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect.poll(cue).toBe("мука́");
  });

  await step(
    "A Known card's cue is the plain term, and the stress returns at the reveal",
    async () => {
      const known = await deck("Мука");
      const { results } = await post("/api/cards/batch", {
        cards: [
          {
            deckId: known.id,
            term: "мука",
            meaning: "torment",
            pronunciation: "му́ка",
            enrich: false,
          },
        ],
      });
      const graded = await post("/api/review/grade", {
        cardId: results[0].card.id,
        direction: "recognition",
        rating: 4,
        reviewedAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
      });
      expect(graded.state).toBe(2);
      await page.goto(`/review?deck=${known.id}`);
      await expect.poll(cue).toBe("мука");
      await reveal();
      await expect.poll(cue).toBe("му́ка");
      return { graded };
    },
  );

  await step("The card form calls a Russian pronunciation Stress and previews it", async () => {
    await page.goto("/library");
    await page
      .getByRole("main")
      .getByRole("link", { name: /^Слова(?!\p{L})/u })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Слова" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("menuitem", { name: /^New card/ }).click();
    const dialog = page.getByRole("dialog", { name: "Add a card" });
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill("мука");
    await dialog.getByRole("button", { name: "Stress", exact: true }).click();
    const stress = dialog.getByRole("textbox", { name: "Stress", exact: true });
    await stress.fill("мука́");
    // The preview draws the stress in place; it is aria-hidden, so read it by its text.
    await expect(dialog.getByText("мука́", { exact: true })).toBeVisible();
    const hint = dialog.getByText(/^Review shows the stress only when/);
    await expect(hint).toHaveCount(0);
    // A typo that is not the term with marks added draws nothing, and the form says so.
    await stress.fill("мкуа́");
    await expect(hint).toBeVisible();
    await page.keyboard.press("Escape");
    const { cards } = await api(`/api/cards?deckId=${words.id}`);
    return { cards };
  });
}
