export const title = "Japanese cards";
export const persona = "fresh";
export const start = "/library";

/** One streamed lesson read, as the server writes it, for a lesson that prints 上手's reading. */
function lessonRead(deckId) {
  const term = (id, value, gloss, pronunciation) => ({
    id,
    term: value,
    kind: "word",
    meaning: gloss,
    gloss,
    pronunciation,
    handwritten: false,
    heading: "第3課",
    seen: value,
    keep: null,
    ticked: true,
    existing: null,
    formOf: null,
  });
  return [
    { type: "deck", deckId, deckName: "日本語", guessed: false },
    { type: "term", term: term("t1", "下手", "unskilful", "へた") },
    { type: "term", term: term("t2", "猫", "cat", null) },
    { type: "questions", questions: [] },
    {
      type: "done",
      pages: 0,
      usage: { model: "stub", inputTokens: 0, outputTokens: 0, costUsd: 0, ms: 1 },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n");
}

export default async function drive({ page, base, step, api, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  let deck;

  await step(
    "Add 上手 to a Japanese deck, then again as ja-JP: the second is skipped",
    async () => {
      deck = await post("/api/decks", { name: "日本語", defaultLanguage: "ja" });
      const card = { deckId: deck.id, term: "上手", meaning: "skilful", enrich: false };
      const { results } = await post("/api/cards/batch", {
        cards: [
          { ...card, pronunciation: "じょうず" },
          { ...card, language: "ja-JP" },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "skipped"]);
      return {
        results: results.map((r) => ({ status: r.status, id: r.card?.id ?? r.existing?.id })),
      };
    },
  );

  // A New card draws its reading as furigana over the kanji, never as a line under the cue.
  const furigana = page.locator("rt", { hasText: "じょうず" }).filter({ visible: true });
  const line = page
    .getByText("じょうず", { exact: true })
    .filter({ visible: true })
    .and(page.locator(":not(rt):not(.sr-only)"));
  await step(
    "Review it: the term shows in a Japanese face with furigana, and no reading line",
    async () => {
      await page.goto(`/review?deck=${deck.id}`);
      const cue = page.getByText("上手").filter({ visible: true }).first();
      await expect(cue).toBeVisible();
      await expect(cue).toHaveAttribute("lang", "ja");
      expect(await cue.evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
        "Hiragino Sans",
      );
      await expect(furigana).toHaveCount(1);
      await expect(line).toHaveCount(0);
    },
  );

  await step("Reveal it: the furigana stays and the meaning shows", async () => {
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(
      page.getByText("skilful", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(furigana).toHaveCount(1);
    await expect(furigana.locator("xpath=..")).toHaveAttribute("lang", "ja");
  });

  await step("Smart add a lesson that prints 下手's reading: the card keeps it", async () => {
    // Only the model's read is stood in for; the pick list, the add and the stored card are real.
    await page.route("**/api/lesson-reads", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ contentType: "application/x-ndjson", body: lessonRead(deck.id) })
        : route.fallback(),
    );
    await page.goto(`/library/${deck.id}`);
    await page.getByRole("button", { name: "Add", exact: true }).first().click();
    await page.getByRole("menuitem", { name: /Smart add/ }).click();
    const dialog = page.getByRole("dialog", { name: /Smart add/ });
    await dialog.getByRole("button", { name: /Text/ }).click();
    await dialog.getByRole("textbox").fill("下手（へた）unskilful\n猫 cat");
    await dialog.getByRole("button", { name: "Add text" }).click();
    await dialog.getByRole("button", { name: "Find terms" }).click();
    await dialog.getByRole("button", { name: "Add 2 cards" }).click();
    await expect(dialog).toBeHidden();
    const find = async (term) =>
      (await api(`/api/cards?term=${encodeURIComponent(term)}`)).cards.find((c) => c.term === term);
    await expect.poll(() => find("下手")).toBeTruthy();
    const unskilful = await find("下手");
    const cat = await find("猫");
    expect(unskilful).toMatchObject({ pronunciation: "へた", pronunciationSource: "lesson" });
    expect(cat).toMatchObject({ pronunciation: null, pronunciationSource: null });
    return { cards: [unskilful, cat] };
  });

  await step(
    "Add 上手 read うわて: a homograph with its own reading is a second card",
    async () => {
      const { results } = await post("/api/cards/batch", {
        cards: [
          {
            deckId: deck.id,
            term: "上手",
            meaning: "a superior",
            pronunciation: "うわて",
            enrich: false,
          },
          { deckId: deck.id, term: "上手", pronunciation: "ジョウズ", enrich: false },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "skipped"]);
      const { cards } = await api(`/api/cards?term=${encodeURIComponent("上手")}`);
      expect(cards.map((c) => c.pronunciation).sort()).toEqual(["うわて", "じょうず"]);
      return { cards };
    },
  );

  await step("Add 食[た]べる from Add a card: it is stored as 食べる read たべる", async () => {
    await page.goto(`/library/${deck.id}`);
    await page.getByRole("main").getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("menuitem", { name: /^New card/ }).click();
    const dialog = page.getByRole("dialog", { name: "Add a card" });
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill("食[た]べる");
    await dialog.getByRole("textbox", { name: "Meaning", exact: true }).fill("to eat");
    await dialog.getByRole("button", { name: /^Add to / }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("region", { name: "Notifications" })).toContainText("食べる");
    const { cards } = await api(`/api/cards?term=${encodeURIComponent("食べる")}`);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ term: "食べる", pronunciation: "たべる" });
    return { card: cards[0] };
  });

  await step(
    "Send bracketed terms through the API: a known word is skipped, a new one names what changed",
    async () => {
      const { results } = await post("/api/cards/batch", {
        cards: [
          { deckId: deck.id, term: "食[た]べる", enrich: false },
          { deckId: deck.id, term: "引[ひ]き出[だ]し", meaning: "drawer", enrich: false },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["skipped", "added"]);
      expect(results[1]).toMatchObject({
        card: { term: "引き出し", pronunciation: "ひきだし" },
        normalized: ["term", "pronunciation"],
      });
      return { results };
    },
  );
}
