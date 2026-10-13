export const title = "Add a card";
export const start = "/library";

const term = "la nebbia";

export default async function drive({ page, step, api, expect }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const total = async () => (await api("/api/decks")).find((d) => d.id === deck.id).total;

  await step("Open Lezione 12 from Library", async () => {
    await page
      .getByRole("main")
      .getByRole("link", { name: /^Lezione 12\b/ })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Lezione 12" })).toBeVisible();
    return { deck: { id: deck.id, total: deck.total } };
  });

  const dialog = page.getByRole("dialog", { name: "Add a card" });
  await step("Fill the term and meaning in Add a card", async () => {
    await page.getByRole("button", { name: "Add card" }).first().click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill(term);
    await dialog.getByRole("textbox", { name: "Meaning", exact: true }).fill("the fog");
  });

  await step("Add it and see it in the deck", async () => {
    await dialog.getByRole("button", { name: "Add to Lezione 12", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("region", { name: "Notifications" })).toContainText(
      `Added “${term}”`,
    );
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    await expect.poll(total).toBe(deck.total + 1);
    const { cards } = await api(`/api/cards?term=${encodeURIComponent(term)}`);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ deckId: deck.id, term, meaning: "the fog" });
    return { card: cards[0] };
  });

  await step("It is still there after a reload", async () => {
    await page.reload();
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    return { total: await total() };
  });
}
