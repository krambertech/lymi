export const title = "Create a deck";
export const start = "/library";

const deckName = "Lezione 13";

/** Fill and submit the New deck sheet; a sheet that asks what the deck is for gets "Something else". */
export async function createDeck(page, expect, name) {
  await page.getByRole("button", { name: "Add", exact: true }).filter({ visible: true }).click();
  await page.getByRole("menuitem", { name: "New deck", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "New deck" });
  await sheet.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  const purpose = sheet.getByRole("radio", { name: /^Something else/ });
  if (await purpose.count()) await purpose.click();
  await sheet.getByRole("button", { name: "Create deck", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

export default async function drive({ page, step, api, expect }) {
  const seeded = await api("/api/decks");

  await step("Create a deck from Add in Library", async () => {
    await createDeck(page, expect, deckName);
    await expect(page).toHaveURL(/\/library\/[^/]+$/);
    const deck = (await api("/api/decks")).find((d) => d.name === deckName);
    expect(deck).toBeTruthy();
    expect(page.url()).toContain(deck.id);
    expect(deck.total).toBe(0);
    expect(deck.role).toBe("owner");
    return deck;
  });

  await step("The new deck is empty and offers a first card", async () => {
    await expect(
      page.getByRole("main").getByRole("button", { name: /card/i }).first(),
    ).toBeVisible();
  });

  await step("Library lists it alongside the others", async () => {
    await page.goto("/library");
    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: new RegExp(`^${deckName}`) })).toBeVisible();
    await expect(main.getByText(`${seeded.length + 1} decks`, { exact: false })).toBeVisible();
    const decks = await api("/api/decks");
    expect(decks).toHaveLength(seeded.length + 1);
    return decks.map((d) => ({ name: d.name, total: d.total }));
  });
}
