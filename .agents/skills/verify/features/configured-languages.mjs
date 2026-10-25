export const title = "Configured languages";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, api, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const find = async (term) =>
    (await api(`/api/cards?term=${encodeURIComponent(term)}`)).cards.find((c) => c.term === term);
  const enriched = async (terms) => {
    const statuses = async () =>
      (await Promise.all(terms.map(find))).map((card) => card?.enrichmentStatus ?? null);
    await expect.poll(statuses, { timeout: 120_000 }).not.toContain("working");
    expect(
      await statuses(),
      "enrichment failed: does apps/web/.dev.vars have OPENAI_API_KEY and AI_GATEWAY_TOKEN?",
    ).toEqual(terms.map(() => null));
  };
  let tagalog;
  let georgian;

  await step(
    "Ask /api/languages: one Filipino entry, the others, and none for a language without a format",
    async () => {
      const { languages } = await api("/api/languages");
      const tags = languages.map((language) => language.tag);
      expect(tags).toEqual(expect.arrayContaining(["fil", "vi", "ka", "hy", "ta", "lt"]));
      for (const tag of ["tl", "et", "nb"]) expect(tags).not.toContain(tag);
      const ka = languages.find((language) => language.tag === "ka");
      expect(ka.pronunciation.sample).toEqual({ term: "ჭიქა", pronunciation: "ch'ika" });
      return { languages: languages.filter((language) => language.tag !== "ja") };
    },
  );

  await step(
    "Make a Tagalog and a Georgian deck: each starts as its evaluation allows",
    async () => {
      tagalog = await post("/api/decks", { name: "Tagalog", defaultLanguage: "tl" });
      georgian = await post("/api/decks", { name: "ქართული", defaultLanguage: "ka" });
      // Filipino sits at the bar, so its gate may be either way; the deck must match it.
      expect([
        [],
        ["meaning", "example", "exampleTranslation", "notes", "pronunciation"],
      ]).toContainEqual(tagalog.enrichFields);
      expect(georgian.enrichFields).toEqual([
        "meaning",
        "example",
        "exampleTranslation",
        "pronunciation",
      ]);
      return { decks: [tagalog, georgian] };
    },
  );

  await step(
    "Add bahay and წყალი with enrichment: stress marks and a romanization land",
    async () => {
      const gated = tagalog.enrichFields.length === 0;
      const { results } = await post("/api/cards/batch", {
        cards: [
          { deckId: tagalog.id, term: "bahay", enrich: true },
          { deckId: georgian.id, term: "წყალი", enrich: true },
        ],
      });
      expect(results.map((r) => r.status)).toEqual(["added", "added"]);
      await enriched(["bahay", "წყალი"]);
      if (gated) {
        // Below the bar nothing lands unasked; the owner turns fields on, then asks.
        expect((await find("bahay")).meaning).toBeNull();
        await page.request.patch(`${base}/api/decks/${tagalog.id}`, {
          data: { enrichFields: ["meaning", "pronunciation"] },
        });
        await post(`/api/cards/${(await find("bahay")).id}/enrich`, {});
        await enriched(["bahay"]);
      }
      const house = await find("bahay");
      const water = await find("წყალი");
      expect(house).toMatchObject({ meaningSource: "ai", pronunciationSource: "ai" });
      expect(house.meaning).toMatch(/house|home/i);
      expect(house.pronunciation.normalize("NFD")).toMatch(/[\u0300\u0301\u0302]/);
      expect(water).toMatchObject({ pronunciation: "ts'q'ali", pronunciationSource: "ai" });
      return { gated, house, water };
    },
  );

  await step("Lithuanian keeps its accent mark; Norwegian decks start with notes", async () => {
    const lithuanian = await post("/api/decks", { name: "Lietuvių", defaultLanguage: "lt" });
    expect(lithuanian.enrichFields).toEqual(["meaning", "example", "exampleTranslation", "notes"]);
    const norwegian = await post("/api/decks", { name: "Norsk", defaultLanguage: "no" });
    expect(norwegian.enrichFields).toEqual(["meaning", "example", "exampleTranslation", "notes"]);
    // The learner's own accent mark goes in and must come back unchanged.
    await post("/api/cards/batch", {
      cards: [{ deckId: lithuanian.id, term: "vyras", meaning: "man", pronunciation: "výras" }],
    });
    const man = await find("vyras");
    expect(man.pronunciation).toBe("výras");
    await page.goto(`/review?deck=${lithuanian.id}`);
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(
      page.getByText(man.pronunciation, { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    return { man, decks: [lithuanian, norwegian] };
  });

  await step("A pt-PT deck is said as in Portugal", async () => {
    const { languages } = await api("/api/languages");
    const tags = languages.map((language) => language.tag);
    expect(tags).toEqual(expect.arrayContaining(["pt", "pt-BR", "fr"]));
    const portugal = await post("/api/decks", {
      name: "Português",
      defaultLanguage: "pt-PT",
      enrichFields: ["meaning", "pronunciation"],
    });
    expect(portugal.enrichFields).toEqual(["meaning", "pronunciation"]);
    await post("/api/cards/batch", {
      cards: [{ deckId: portugal.id, term: "leite", enrich: true }],
    });
    await enriched(["leite"]);
    const filled = await find("leite");
    expect(filled.pronunciation).toMatch(/ɨ/);
    expect(filled.pronunciation).not.toMatch(/tʃ/);
    return { filled };
  });

  await step("Review წყალი and reveal it: ts'q'ali shows, in Georgian's face", async () => {
    await page.goto(`/review?deck=${georgian.id}`);
    const term = page.getByText("წყალი").filter({ visible: true }).first();
    await expect(term).toBeVisible();
    const face = await term.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(face).toContain("Helvetica Neue");
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(
      page.getByText("ts'q'ali", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    return { face };
  });
}
