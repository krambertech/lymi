export const title = "Library and the deck page";
export const start = "/library";

export default async function drive({ page, step, api, expect }) {
  const decks = await api("/api/decks");
  const deck = decks.find((d) => d.name === "Lezione 12");
  const rows = page.getByRole("main").getByRole("listitem").getByRole("button");

  await step("Library lists the learner's three decks with their counts", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();
    const cards = decks.reduce((n, d) => n + d.total, 0);
    await expect(page.getByText(`${decks.length} decks · ${cards} cards`)).toBeVisible();
    for (const d of decks) {
      await expect(
        page.getByRole("main").getByRole("link", { name: new RegExp(`^${d.name}\\b`) }),
      ).toBeVisible();
    }
    return { decks: decks.map(({ id, name, total, due }) => ({ id, name, total, due })) };
  });

  await step("The deck page lists every card in Lezione 12", async () => {
    await page
      .getByRole("main")
      .getByRole("link", { name: /^Lezione 12\b/ })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Lezione 12" })).toBeVisible();
    await expect(rows).toHaveCount(deck.total);
    return { deck: { id: deck.id, total: deck.total, due: deck.due } };
  });

  await step("Filtering to Due today leaves the deck's due cards", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "Due today", exact: true }).click();
    await page.keyboard.press("Escape");
    if (deck.due > 0) await expect(rows).toHaveCount(deck.due);
    else
      await expect(page.getByText("No cards match these filters", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove filter: Due today", exact: true }).click();
    await expect(rows).toHaveCount(deck.total);
  });

  await step("Opening a card shows its term and meaning", async () => {
    const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=100`);
    const first = await rows.first().innerText();
    const card = cards.find((c) => first.includes(c.term));
    await rows.first().click();
    await expect(page.getByRole("heading", { name: card.term })).toBeVisible();
    await expect(page.getByText(card.meaning, { exact: true }).first()).toBeVisible();
    return { card: { id: card.id, term: card.term, meaning: card.meaning } };
  });
}
