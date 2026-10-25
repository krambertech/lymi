export const title = "Polish cards";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, api, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const deck = (name) =>
    post("/api/decks", { name, defaultLanguage: "pl", directions: "recognition" });
  // The cue's term and its underlined run, outside the hidden copy that sizes the card.
  const cueLine = () =>
    page
      .getByRole("region", { name: /Recognition card/ })
      .locator("p[lang='pl']")
      .filter({ visible: true })
      .first();
  const cue = () =>
    cueLine().evaluate((el) => {
      const underlined = [...el.querySelectorAll("span")]
        .filter((span) => getComputedStyle(span).textDecorationLine.includes("underline"))
        .map((span) => span.textContent)
        .join("|");
      // The speaker joins the last word with U+2060, which is no part of the term.
      return `${el.textContent.replaceAll("⁠", "").trim()} [${underlined}]`;
    });
  const reveal = () =>
    page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  let words;

  await step(
    "Add muzyka stressed mùzyka, an acute that becomes the grave, and żółw with its ó",
    async () => {
      words = await deck("Słowa");
      const { results } = await post("/api/cards/batch", {
        cards: [
          {
            deckId: words.id,
            term: "muzyka",
            meaning: "music",
            pronunciation: "mùzyka",
            enrich: false,
          },
          // An acute, as a Polish keyboard types it over a vowel.
          {
            deckId: words.id,
            term: "matematyka",
            meaning: "mathematics",
            pronunciation: "matemátyka",
            enrich: false,
          },
          { deckId: words.id, term: "żółw", meaning: "turtle", enrich: false },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "added", "added"]);
      expect(results[1]).toMatchObject({
        card: { pronunciation: "matemàtyka" },
        normalized: ["pronunciation"],
      });
      expect(results[2].card.term).toBe("żółw");
      const again = await post("/api/cards/batch", {
        cards: [{ deckId: words.id, term: "żółw", enrich: false }],
      });
      expect(again.results.map((r) => r.status)).toEqual(["skipped"]);
      return { results };
    },
  );

  await step("A New card underlines its stressed syllable on the cue and the answer", async () => {
    // A word of its own, since a term already in another deck is skipped as a duplicate.
    const politics = await deck("Polityka");
    await post("/api/cards/batch", {
      cards: [
        {
          deckId: politics.id,
          term: "polityka",
          meaning: "politics",
          pronunciation: "polìtyka",
          enrich: false,
        },
      ],
    });
    await page.goto(`/review?deck=${politics.id}`);
    await expect.poll(cue).toBe("polityka [li]");
    const line = page
      .getByText("polìtyka", { exact: true })
      .filter({ visible: true })
      .and(page.locator(":not(.sr-only)"));
    await expect(line).toHaveCount(0);
    await reveal();
    await expect(
      page.getByText("politics", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect.poll(cue).toBe("polityka [li]");
  });

  await step("A Known card's cue is plain, and the underline returns at the reveal", async () => {
    const known = await deck("Fizyka");
    const { results } = await post("/api/cards/batch", {
      cards: [
        {
          deckId: known.id,
          term: "fizyka",
          meaning: "physics",
          pronunciation: "fìzyka",
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
    await expect.poll(cue).toBe("fizyka []");
    await reveal();
    await expect.poll(cue).toBe("fizyka [fi]");
    return { graded };
  });

  await step("The card form calls a Polish pronunciation Stress and previews it", async () => {
    await page.goto("/library");
    await page
      .getByRole("main")
      .getByRole("link", { name: /^Słowa(?!\p{L})/u })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Słowa" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("menuitem", { name: /^New card/ }).click();
    const dialog = page.getByRole("dialog", { name: "Add a card" });
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill("muzyka");
    await dialog.getByRole("button", { name: "Stress", exact: true }).click();
    const stress = dialog.getByRole("textbox", { name: "Stress", exact: true });
    await stress.fill("mùzyka");
    const hint = dialog.getByText(/^Review shows the stress only when/);
    await expect(hint).toHaveCount(0);
    // A typo that is not the term with a mark added draws nothing, and the form says so.
    await stress.fill("mzùyka");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("mùzyka");
    await page.keyboard.press("Escape");
    const { cards } = await api(`/api/cards?deckId=${words.id}`);
    return { cards };
  });
}
