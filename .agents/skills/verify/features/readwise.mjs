export const title = "Readwise";
export const start = "/settings";
export const persona = "learner";

const book = "Una stagione a Torino";

export default async function drive({ page, step, api, expect }) {
  await step("Open Readwise from Settings", async () => {
    await page.getByRole("link", { name: /^Readwise/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Readwise" })).toBeVisible();
    await expect(page.getByText("Not connected")).toBeVisible();
  });

  await step("Connect with the fake token", async () => {
    await page.getByLabel("Readwise token").fill("lymi-dev-readwise-0000");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText("Connected", { exact: true })).toBeVisible();
    await expect(page.getByText(book)).toBeVisible();
  });

  await step("Choose Italian for the Italian book", async () => {
    const row = page.getByRole("listitem").filter({ hasText: book });
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "Italian" }).click();
    await expect(row.getByRole("switch")).toBeChecked();
  });

  await step("Check now turns its highlights into cards", async () => {
    await page.getByRole("button", { name: "Check now" }).click();
    await expect(page.getByText("Added 3 cards to Casa")).toBeVisible();
    const casa = (await api("/api/decks")).find((d) => d.name === "Casa");
    const { cards } = await api(`/api/cards?deckId=${casa.id}`);
    const added = cards.filter((c) => c.source?.startsWith(book));
    expect(added).toHaveLength(3);
    return { added: added.map((c) => c.term) };
  });

  await step("Open everything Readwise did in Activity", async () => {
    await page.getByRole("link", { name: "Everything Readwise did, in Activity" }).click();
    await expect(page).toHaveURL(/\/activity\?app=readwise/);
    await expect(page.getByRole("link", { name: "Show everything" })).toBeVisible();
    const { entries } = await api("/api/activity?app=readwise");
    expect(entries.length).toBeGreaterThan(0);
    return { entries: entries.length };
  });

  await step("Disconnect, and the cards stay", async () => {
    await page.goBack();
    await page.getByRole("button", { name: "Disconnect Readwise" }).click();
    await page.getByRole("button", { name: "Disconnect Readwise" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByText("Readwise is disconnected")).toBeVisible();
    const casa = (await api("/api/decks")).find((d) => d.name === "Casa");
    const { cards } = await api(`/api/cards?deckId=${casa.id}`);
    expect(cards.filter((c) => c.source?.startsWith(book))).toHaveLength(3);
  });
}
