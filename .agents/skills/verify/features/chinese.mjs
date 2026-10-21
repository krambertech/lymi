export const title = "Chinese cards";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, api, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const deck = (name, defaultLanguage) =>
    post("/api/decks", { name, defaultLanguage, directions: "recognition" });
  // Pinyin drawn over the cue, outside the hidden copy that sizes the card.
  const pinyin = () =>
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
  const cueFont = () =>
    page
      .locator("rt")
      .first()
      .evaluate((rt) => {
        const line = rt.closest("[lang]");
        return { lang: line.getAttribute("lang"), font: getComputedStyle(line).fontFamily };
      });
  let little;
  let study;
  let known;

  await step(
    "Add Chinese cards: tone numbers become marks and 行 read háng and xíng are two cards",
    async () => {
      const words = await deck("词语", "zh");
      const { results } = await post("/api/cards/batch", {
        cards: [
          { deckId: words.id, term: "行", meaning: "a row", pronunciation: "háng", enrich: false },
          { deckId: words.id, term: "行", meaning: "to go", pronunciation: "xing2", enrich: false },
          { deckId: words.id, term: "行", pronunciation: "Xíng", enrich: false },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "added", "skipped"]);
      expect(results[1]).toMatchObject({
        card: { pronunciation: "xíng" },
        normalized: ["pronunciation"],
      });
      return { results };
    },
  );

  await step("A New card draws one syllable over each character, 儿 sharing diǎnr", async () => {
    little = await deck("中文", "zh");
    await post("/api/cards/batch", {
      cards: [
        {
          deckId: little.id,
          term: "一点儿",
          meaning: "a little",
          pronunciation: "yi4 dian3r",
          enrich: false,
        },
      ],
    });
    await page.goto(`/review?deck=${little.id}`);
    await expect.poll(pinyin).toEqual(["yì", "diǎnr"]);
    const ruby = page.locator("ruby", { hasText: "diǎnr" }).filter({ visible: true }).first();
    expect(await ruby.evaluate((el) => el.firstChild.textContent)).toBe("点儿");
    expect(await cueFont()).toMatchObject({
      lang: "zh",
      font: expect.stringContaining("PingFang SC"),
    });
    // No pinyin line under the cue: the reading is drawn over the term.
    const line = page
      .getByText("yì diǎnr", { exact: true })
      .filter({ visible: true })
      .and(page.locator(":not(.sr-only)"));
    await expect(line).toHaveCount(0);
    await reveal();
    await expect(
      page.getByText("a little", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect.poll(pinyin).toEqual(["yì", "diǎnr"]);
  });

  await step("A traditional card draws pinyin in the traditional face", async () => {
    study = await deck("國語", "zh-TW");
    await post("/api/cards/batch", {
      cards: [
        {
          deckId: study.id,
          term: "學習",
          meaning: "to study",
          pronunciation: "xuéxí",
          enrich: false,
        },
      ],
    });
    await page.goto(`/review?deck=${study.id}`);
    await expect.poll(pinyin).toEqual(["xué", "xí"]);
    expect(await cueFont()).toMatchObject({
      lang: "zh-TW",
      font: expect.stringContaining("PingFang TC"),
    });
  });

  await step("A Known card's pinyin waits for the reveal, then shows over the term", async () => {
    known = await deck("东西", "zh");
    const { results } = await post("/api/cards/batch", {
      cards: [
        {
          deckId: known.id,
          term: "东西",
          meaning: "thing",
          pronunciation: "dōngxi",
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
    await expect(page.getByLabel(/ card for /)).toHaveAttribute("aria-label", /东西/);
    await expect.poll(pinyin).toEqual([]);
    await reveal();
    await expect.poll(pinyin).toEqual(["dōng", "xi"]);
    const { cards } = await api(`/api/cards?term=${encodeURIComponent("东西")}`);
    return { graded, cards };
  });

  await step(
    "An example's pinyin fades over 行 read háng, which a Known 银行 reads, and never over 行 xíng",
    async () => {
      const bank = await deck("银行", "zh");
      const { results } = await post("/api/cards/batch", {
        cards: [
          {
            deckId: bank.id,
            term: "银行",
            meaning: "bank",
            pronunciation: "yínháng",
            enrich: false,
          },
        ],
      });
      // Easy a day ago: Known and not due, so it gives its pairs without joining the review.
      const graded = await post("/api/review/grade", {
        cardId: results[0].card.id,
        direction: "recognition",
        rating: 4,
        reviewedAt: new Date(Date.now() - 86_400_000).toISOString(),
      });
      expect(graded.state).toBe(2);
      const president = await deck("行长", "zh");
      const added = await post("/api/cards/batch", {
        cards: [
          {
            deckId: president.id,
            term: "行长",
            meaning: "bank president",
            pronunciation: "hángzhǎng",
            example: "行长说不行[hángzhǎng shuō bù xíng]。",
            enrich: false,
          },
        ],
      });
      await page.goto(`/review?deck=${president.id}`);
      await expect.poll(pinyin).toEqual(["háng", "zhǎng"]);
      await reveal();
      // The term's own pinyin stays; in the example only háng, the Known 银行's 行, fades.
      await expect.poll(pinyin).toEqual(["háng", "zhǎng", "zhǎng", "shuō", "bù", "xíng"]);
      await expect(page.locator("rt", { hasText: "háng" })).toHaveCount(2);
      const card = added.results[0].card;
      await page.goto(`/library/${president.id}?card=${card.id}`);
      await expect
        .poll(() =>
          page
            .getByRole("complementary")
            .getByRole("article")
            .locator("rt")
            .filter({ visible: true })
            .evaluateAll((rts) => rts.map((rt) => rt.textContent)),
        )
        .toEqual(["háng", "zhǎng", "zhǎng", "shuō", "bù", "xíng"]);
      return { graded, card };
    },
  );
}
