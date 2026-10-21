export const title = "Cantonese cards";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const deck = (name, defaultLanguage) =>
    post("/api/decks", { name, defaultLanguage, directions: "recognition" });
  const card = (deckId, term, meaning, pronunciation, example) => ({
    deckId,
    term,
    meaning,
    pronunciation,
    ...(example ? { example } : {}),
    enrich: false,
  });
  // Jyutping drawn over the cue, outside the hidden copy that sizes the card.
  const jyutping = () =>
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

  await step(
    "Add Cantonese cards: raised tone numbers become digits and 行 read hong4 and hang4 are two cards",
    async () => {
      const words = await deck("詞語", "yue");
      const { results } = await post("/api/cards/batch", {
        cards: [
          card(words.id, "行", "a row; a trade", "hong4"),
          card(words.id, "行", "to walk", "hang⁴"),
          card(words.id, "行", undefined, "Hang4"),
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "added", "skipped"]);
      expect(results[1]).toMatchObject({
        card: { pronunciation: "hang4" },
        normalized: ["pronunciation"],
      });
      return { results };
    },
  );

  await step("A New card draws one syllable over each character, 𨋢 included", async () => {
    const lift = await deck("廣東話", "yue");
    await post("/api/cards/batch", {
      cards: [card(lift.id, "搭𨋢", "to take the lift", "daap3 lip1")],
    });
    await page.goto(`/review?deck=${lift.id}`);
    await expect.poll(jyutping).toEqual(["daap3", "lip1"]);
    const ruby = page.locator("ruby", { hasText: "lip1" }).filter({ visible: true }).first();
    expect(await ruby.evaluate((el) => el.firstChild.textContent)).toBe("𨋢");
    expect(await cueFont()).toMatchObject({
      lang: "yue",
      font: expect.stringContaining("PingFang TC"),
    });
  });

  await step("A zh-yue card is Cantonese, in the traditional face", async () => {
    const thanks = await deck("粵語", "zh-yue");
    await post("/api/cards/batch", {
      cards: [card(thanks.id, "唔該", "thank you", "m4 goi1")],
    });
    await page.goto(`/review?deck=${thanks.id}`);
    await expect.poll(jyutping).toEqual(["m4", "goi1"]);
    const font = await cueFont();
    expect(font).toMatchObject({ lang: "zh-yue", font: expect.stringContaining("PingFang TC") });
    expect(font.font).not.toContain("PingFang SC");
    await reveal();
    await expect(
      page.getByText("thank you", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect.poll(jyutping).toEqual(["m4", "goi1"]);
  });

  await step(
    "An example's Jyutping fades over 行 read hong4, which a Known 銀行 reads, and never over 行 hang4",
    async () => {
      const bank = await deck("銀行", "yue");
      const { results } = await post("/api/cards/batch", {
        cards: [card(bank.id, "銀行", "bank", "ngan4 hong4")],
      });
      // Easy a day ago: Known and not due, so it gives its pairs without joining the review.
      const graded = await post("/api/review/grade", {
        cardId: results[0].card.id,
        direction: "recognition",
        rating: 4,
        reviewedAt: new Date(Date.now() - 86_400_000).toISOString(),
      });
      expect(graded.state).toBe(2);
      const trade = await deck("行業", "yue");
      const added = await post("/api/cards/batch", {
        cards: [
          card(
            trade.id,
            "行業",
            "industry",
            "hong4 jip6",
            "呢個行業好難行[ni1 go3 hong4 jip6 hou2 naan4 hang4]。",
          ),
        ],
      });
      const shown = ["hong4", "jip6", "ni1", "go3", "jip6", "hou2", "naan4", "hang4"];
      await page.goto(`/review?deck=${trade.id}`);
      await expect.poll(jyutping).toEqual(["hong4", "jip6"]);
      await reveal();
      await expect.poll(jyutping).toEqual(shown);
      await expect(page.locator("rt", { hasText: "hong4" })).toHaveCount(2);
      const added0 = added.results[0].card;
      await page.goto(`/library/${trade.id}?card=${added0.id}`);
      await expect
        .poll(() =>
          page
            .getByRole("complementary")
            .getByRole("article")
            .locator("rt")
            .filter({ visible: true })
            .evaluateAll((rts) => rts.map((rt) => rt.textContent)),
        )
        .toEqual(shown);
      return { graded, card: added0 };
    },
  );
}
