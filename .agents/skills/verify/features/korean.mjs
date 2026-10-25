export const title = "Korean cards";
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
  let deck;

  await step("Ask /api/languages: Korean writes pronounced Hangul", async () => {
    const { languages } = await api("/api/languages");
    const korean = languages.find((language) => language.tag === "ko");
    expect(korean).toMatchObject({
      pronunciation: { label: "pronunciation", sample: { term: "학교", pronunciation: "학꾜" } },
      example: null,
      duplicates: "term",
    });
    return { korean };
  });

  await step("Add 학교 and 사랑 to Korean decks with enrichment, and wait for it", async () => {
    deck = await post("/api/decks", { name: "한국어", defaultLanguage: "ko" });
    const other = await post("/api/decks", { name: "한국어 2", defaultLanguage: "ko" });
    const { results } = await post("/api/cards/batch", {
      cards: [
        { deckId: deck.id, term: "학교", enrich: true },
        { deckId: other.id, term: "사랑", enrich: true },
      ],
    });
    expect(results.map((r) => r.status)).toEqual(["added", "added"]);
    await enriched(["학교", "사랑"]);
  });

  await step("학교 holds 학꾜 and its root 學; 사랑 needs none", async () => {
    const school = await find("학교");
    const love = await find("사랑");
    expect(school).toMatchObject({ pronunciation: "학꾜", pronunciationSource: "ai" });
    expect(school.notes).toContain("學");
    expect(love.pronunciation).toBeNull();
    expect(`${school.notes} ${love.notes ?? ""}`).not.toMatch(/hakgyo|sarang/i);
    return { cards: [school, love] };
  });

  await step("Review 학교 and reveal it: the line 학꾜 shows", async () => {
    await page.goto(`/review?deck=${deck.id}`);
    await expect(page.getByText("학교").filter({ visible: true }).first()).toBeVisible();
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await expect(page.getByText("학꾜", { exact: true }).filter({ visible: true })).toBeVisible();
  });
}
