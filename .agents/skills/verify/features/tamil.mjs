export const title = "Tamil cards";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, api, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const deck = (name) =>
    post("/api/decks", { name, defaultLanguage: "ta", directions: "recognition" });
  // Readings drawn over the card, outside the hidden copy that sizes it.
  const readings = () =>
    page
      .locator("rt")
      .filter({ visible: true })
      .evaluateAll((rts) =>
        rts
          .filter((rt) => !rt.parentElement.closest("[aria-hidden='true']"))
          .map((rt) => rt.textContent),
      );
  const reveal = () =>
    page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  const easy = (cardId, daysAgo) =>
    post("/api/review/grade", {
      cardId,
      direction: "recognition",
      rating: 4,
      reviewedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    });
  let words;

  await step(
    "Add Tamil cards: a reading that repeats the spelling's is stored empty, a loanword's is kept",
    async () => {
      words = await deck("சொற்கள்");
      const { results } = await post("/api/cards/batch", {
        cards: [
          { deckId: words.id, term: "பாடல்", meaning: "song", pronunciation: "pāḍal", enrich: false },
          { deckId: words.id, term: "பஸ்", meaning: "bus", pronunciation: "bas", enrich: false },
          { deckId: words.id, term: "பாடல்", pronunciation: "paadal", enrich: false },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "added", "skipped"]);
      expect(results[0]).toMatchObject({
        card: { pronunciation: null },
        normalized: ["pronunciation"],
      });
      expect(results[1]).toMatchObject({ card: { pronunciation: "bas" } });
      return { results };
    },
  );

  await step("A New card draws each word's reading over it, in the Tamil face", async () => {
    const song = await deck("தமிழ்");
    await post("/api/cards/batch", {
      cards: [{ deckId: song.id, term: "தமிழ் பாடல்", meaning: "Tamil song", enrich: false }],
    });
    await page.goto(`/review?deck=${song.id}`);
    await expect.poll(readings).toEqual(["tamizh", "pāḍal"]);
    const font = await page
      .locator("rt")
      .first()
      .evaluate((rt) => {
        const line = rt.closest("[lang]");
        return { lang: line.getAttribute("lang"), font: getComputedStyle(line).fontFamily };
      });
    expect(font).toMatchObject({ lang: "ta", font: expect.stringContaining("Tamil Sangam MN") });
    await reveal();
    await expect(
      page.getByText("Tamil song", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect.poll(readings).toEqual(["tamizh", "pāḍal"]);
  });

  await step("A loanword draws the card's own reading", async () => {
    // Spelled பேக், pēk, and said bēg; பஸ் already has its card in the first deck.
    const bag = await deck("பேக்");
    await post("/api/cards/batch", {
      cards: [{ deckId: bag.id, term: "பேக்", meaning: "bag", pronunciation: "bēg", enrich: false }],
    });
    await page.goto(`/review?deck=${bag.id}`);
    await expect.poll(readings).toEqual(["bēg"]);
  });

  await step("A Known card's reading waits for the reveal", async () => {
    const home = await deck("வீடு");
    const { results } = await post("/api/cards/batch", {
      cards: [{ deckId: home.id, term: "வீடு", meaning: "house", enrich: false }],
    });
    const graded = await easy(results[0].card.id, 40);
    expect(graded.state).toBe(2);
    await page.goto(`/review?deck=${home.id}`);
    await expect(page.getByLabel(/ card for /)).toHaveAttribute("aria-label", /வீடு/);
    await expect.poll(readings).toEqual([]);
    await reveal();
    await expect.poll(readings).toEqual(["vīḍu"]);
    return { graded };
  });

  await step(
    "An example's reading fades over a Known word as written, and stays over its inflected form",
    async () => {
      const known = await deck("மரம்");
      const { results } = await post("/api/cards/batch", {
        cards: [{ deckId: known.id, term: "மரம்", meaning: "tree", enrich: false }],
      });
      // Easy a day ago: Known and not due, so it gives its pair without joining the review.
      expect((await easy(results[0].card.id, 1)).state).toBe(2);
      const school = await deck("பள்ளி");
      const added = await post("/api/cards/batch", {
        cards: [
          {
            deckId: school.id,
            term: "பள்ளி",
            meaning: "school",
            example: "பள்ளியில் ஒரு மரம் உள்ளது, மரத்தில் பறவை.",
            enrich: false,
          },
        ],
      });
      await page.goto(`/review?deck=${school.id}`);
      await expect.poll(readings).toEqual(["paḷḷi"]);
      await reveal();
      // மரம் fades; மரத்தில் (in the tree) is another form and keeps its reading.
      await expect
        .poll(readings)
        .toEqual(["paḷḷi", "paḷḷiyil", "oru", "uḷḷadu", "marattil", "paravai"]);
      return { card: added.results[0].card };
    },
  );

  await step("The card form calls the field Reading and previews the drawn reading", async () => {
    await page.goto("/library");
    await page
      .getByRole("main")
      .getByRole("link", { name: /^சொற்கள்/u })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "சொற்கள்" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("menuitem", { name: /^New card/ }).click();
    const dialog = page.getByRole("dialog", { name: "Add a card" });
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill("ஜன்னல்");
    await dialog.getByRole("button", { name: "Reading", exact: true }).click();
    // The preview is aria-hidden, so read its reading by its text.
    await expect(dialog.locator("rt", { hasText: "jannal" })).toBeVisible();
    await dialog.getByRole("textbox", { name: "Reading", exact: true }).fill("jannel");
    await expect(dialog.locator("rt", { hasText: "jannel" })).toBeVisible();
    await page.keyboard.press("Escape");
    const { cards } = await api(`/api/cards?deckId=${words.id}`);
    return { cards };
  });
}
