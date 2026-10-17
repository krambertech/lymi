export const title = "Furigana";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const card = page.getByLabel(/ card for /);
  const shown = (text) => page.locator("rt", { hasText: text }).filter({ visible: true });
  const reveal = () =>
    page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  let fresh;
  let known;
  let food;

  await step("Make a New and a Known Japanese card with readings", async () => {
    fresh = await post("/api/decks", {
      name: "日本語",
      defaultLanguage: "ja",
      directions: "recognition",
    });
    known = await post("/api/decks", {
      name: "漢字",
      defaultLanguage: "ja",
      directions: "recognition",
    });
    const add = await post("/api/cards/batch", {
      cards: [
        {
          deckId: fresh.id,
          term: "食べ物",
          meaning: "food",
          pronunciation: "たべもの",
          example: "どんな食[た]べ物[もの]が好[す]きですか。",
          enrich: false,
        },
        {
          deckId: known.id,
          term: "学校",
          meaning: "school",
          pronunciation: "がっこう",
          enrich: false,
        },
        {
          deckId: known.id,
          term: "好き",
          meaning: "to like",
          pronunciation: "すき",
          enrich: false,
        },
      ],
    });
    food = add.results[0].card;
    const school = add.results[1].card;
    const like = add.results[2].card;
    const days = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
    const graded = await post("/api/review/grade", {
      cardId: school.id,
      direction: "recognition",
      rating: 4,
      reviewedAt: days(40),
    });
    expect(graded.state).toBe(2);
    // Known and not due, so the Known deck's review still holds 学校 alone.
    const liked = await post("/api/review/grade", {
      cardId: like.id,
      direction: "recognition",
      rating: 4,
      reviewedAt: days(1),
    });
    expect(liked.state).toBe(2);
    return { food, school, like, graded, liked };
  });

  await step("A New card's cue draws furigana over the term", async () => {
    await page.goto(`/review?deck=${fresh.id}`);
    await expect(card).toHaveAttribute("aria-label", "Recognition card for 食べ物");
    await expect(shown("たべもの")).toHaveCount(0);
    await expect(shown("た")).toHaveCount(1);
    await expect(shown("もの")).toHaveCount(1);
  });

  await step(
    "Revealed, the example fades the reading over the Known 好き in another deck, and only a screen reader hears the term's reading again",
    async () => {
      await reveal();
      await expect(page.getByText("food", { exact: true }).filter({ visible: true })).toBeVisible();
      // The Known pairs come from every deck's cached cards, which the app warms after it loads.
      await expect(shown("す")).toHaveCount(0);
      await expect(page.locator("rt", { hasText: "す" }).first()).toBeAttached();
      // た and もの show twice: over the answer's term and over the example.
      await expect(shown("た")).toHaveCount(2);
      await expect(shown("もの")).toHaveCount(2);
      const line = page.getByText("たべもの", { exact: true }).filter({ visible: true });
      await expect(line).toHaveCount(1);
      await expect(line).toHaveClass(/sr-only/);
    },
  );

  await step("A Known card's cue hides the reading until the reveal", async () => {
    await page.goto(`/review?deck=${known.id}`);
    await expect(card).toHaveAttribute("aria-label", "Recognition card for 学校");
    await expect(page.locator("rt", { hasText: "がっこう" }).first()).toBeAttached();
    await expect(shown("がっこう")).toHaveCount(0);
    await reveal();
    await expect(shown("がっこう")).toHaveCount(1);
  });

  await step(
    "The card page fades the Known reading, and the editor calls the field Reading and previews every reading",
    async () => {
      await page.goto(`/library/${fresh.id}?card=${food.id}`);
      await expect(page.getByRole("heading", { name: "食べ物" })).toBeVisible();
      await expect(shown("もの").first()).toBeVisible();
      await expect(
        page.locator("main rt", { hasText: "す" }).filter({ visible: true }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Edit card" }).click();
      const dialog = page.getByRole("dialog", { name: "Edit card" });
      await expect(dialog.getByRole("textbox", { name: "Reading" })).toHaveValue("たべもの");
      await expect(dialog.locator("rt", { hasText: "す" })).toBeVisible();
    },
  );
}
