export const title = "Adaptive pronunciation";
export const persona = "fresh";
export const start = "/library";

export default async function drive({ page, base, step, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(`${base}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const read = async (path) => (await page.request.get(`${base}${path}`)).json();
  const card = page.getByLabel(/ card for /);
  const pinyin = () => page.locator("rt").filter({ visible: true });
  const reveal = () =>
    page.getByRole("button", { name: "Reveal the card" }).click({ position: { x: 24, y: 24 } });
  const toggle = page.getByRole("switch", { name: "Adaptive pronunciation" });
  let deck;

  await step("Make a Chinese deck with one New card", async () => {
    deck = await post("/api/decks", {
      name: "汉语",
      defaultLanguage: "zh-CN",
      directions: "recognition",
    });
    await post("/api/cards/batch", {
      cards: [
        {
          deckId: deck.id,
          term: "学习",
          meaning: "to study",
          pronunciation: "xuéxí",
          enrich: false,
        },
      ],
    });
    expect(deck.pronunciationDisplay).toBe("adaptive");
    return { deck };
  });

  await step("A New card's cue draws pinyin while adaptive pronunciation is on", async () => {
    await page.goto(`/review?deck=${deck.id}`);
    await expect(card).toHaveAttribute("aria-label", "Recognition card for 学习");
    await expect(pinyin()).toHaveText(["xué", "xí"]);
  });

  await step("Deck settings turn adaptive pronunciation off", async () => {
    await page.goto(`/library/${deck.id}/settings`);
    await expect(toggle).toBeChecked();
    await expect(page.getByText(/Pinyin shows over the term/)).toBeVisible();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await expect(page.getByText(/Pinyin shows on its own line/)).toBeVisible();
    await expect
      .poll(async () => (await read(`/api/decks/${deck.id}`)).pronunciationDisplay)
      .toBe("separate");
    return { deck: await read(`/api/decks/${deck.id}`) };
  });

  await step("The same New card's cue keeps its pinyin for the reveal", async () => {
    await page.goto(`/review?deck=${deck.id}`);
    await expect(card).toHaveAttribute("aria-label", "Recognition card for 学习");
    await expect(pinyin()).toHaveCount(0);
  });

  await step("The reveal shows the pinyin as its own line, not over the term", async () => {
    await reveal();
    await expect(
      page.getByText("to study", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByText("xuéxí", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(pinyin()).toHaveCount(0);
  });

  await step("A Spanish deck offers no switch", async () => {
    const plain = await post("/api/decks", { name: "Español", defaultLanguage: "es" });
    await page.goto(`/library/${plain.id}/settings`);
    await expect(page.getByRole("heading", { name: "Review modes" })).toBeVisible();
    await expect(toggle).toHaveCount(0);
  });
}
