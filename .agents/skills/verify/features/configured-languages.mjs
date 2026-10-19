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
  const settled = (terms) => async () =>
    (await Promise.all(terms.map(find))).map((card) => card?.enrichmentStatus ?? null);
  let tagalog;
  let georgian;

  await step("Ask /api/languages: one Filipino entry, and the four others", async () => {
    const { languages } = await api("/api/languages");
    const tags = languages.map((language) => language.tag);
    expect(tags).toEqual(expect.arrayContaining(["fil", "vi", "ka", "hy", "ta"]));
    expect(tags).not.toContain("tl");
    const ka = languages.find((language) => language.tag === "ka");
    expect(ka.pronunciation.sample).toEqual({ term: "ჭიქა", pronunciation: "ch'ika" });
    return { languages: languages.filter((language) => language.tag !== "ja") };
  });

  await step("Make a Tagalog and a Georgian deck: only Georgian enriches unasked", async () => {
    tagalog = await post("/api/decks", { name: "Tagalog", defaultLanguage: "tl" });
    georgian = await post("/api/decks", { name: "ქართული", defaultLanguage: "ka" });
    expect(tagalog.enrichFields).toEqual([]);
    expect(georgian.enrichFields).toEqual(["meaning", "example", "pronunciation"]);
    return { decks: [tagalog, georgian] };
  });

  await step("Add bahay and წყალი with enrichment, and wait for it", async () => {
    const { results } = await post("/api/cards/batch", {
      cards: [
        { deckId: tagalog.id, term: "bahay", enrich: true },
        { deckId: georgian.id, term: "წყალი", enrich: true },
      ],
    });
    expect(results.map((r) => r.status)).toEqual(["added", "added"]);
    await expect.poll(settled(["bahay", "წყალი"]), { timeout: 120_000 }).toEqual([null, null]);
    const water = await find("წყალი");
    expect(water).toMatchObject({ pronunciation: "ts'q'ali", pronunciationSource: "ai" });
    expect((await find("bahay")).meaning).toBeNull();
    return { water };
  });

  await step("In the Tagalog deck's settings, let AI fill meaning and pronunciation", async () => {
    const main = page.getByRole("main");
    await page.goto(`/library/${tagalog.id}/settings`);
    // The checkbox flips once the saved deck comes back, so click and wait rather than check().
    for (const name of ["Meaning", "Pronunciation"]) {
      const box = main.getByRole("checkbox", { name, exact: true });
      await expect(box).not.toBeChecked();
      await box.click();
      await expect(box).toBeChecked();
    }
    const stored = async () => (await api("/api/decks")).find((d) => d.id === tagalog.id);
    await expect
      .poll(async () => (await stored()).enrichFields)
      .toEqual(["meaning", "pronunciation"]);
    return stored();
  });

  await step("Ask Enrich on bahay: its meaning and stress marks land", async () => {
    const house = await find("bahay");
    await post(`/api/cards/${house.id}/enrich`, {});
    await expect.poll(settled(["bahay"]), { timeout: 120_000 }).toEqual([null]);
    const filled = await find("bahay");
    expect(filled).toMatchObject({ meaningSource: "ai", pronunciationSource: "ai" });
    expect(filled.meaning).toMatch(/house|home/i);
    expect(filled.pronunciation.normalize("NFD")).toMatch(/[\u0300\u0301\u0302]/);
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
