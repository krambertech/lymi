export const title = "Add a card";
export const start = "/library";

const term = "la nebbia";
const hint = "a hazy nebula";

export default async function drive({ page, step, api, expect }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  let added;
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
    await page.getByRole("main").getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("menuitem", { name: /^New card/ }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("textbox", { name: "Term", exact: true }).fill(term);
    await dialog.getByRole("textbox", { name: "Meaning", exact: true }).fill("the fog");
  });

  await step("Add Notes from its chip and pick a tag from Tags", async () => {
    // A text chip adds its field in place; a choice chip opens its list and then shows the choice.
    await dialog.getByRole("button", { name: "Notes", exact: true }).click();
    await dialog.getByRole("textbox", { name: "Notes", exact: true }).fill("c'è la nebbia");
    await dialog.getByLabel("Tags", { exact: true }).click();
    await page.getByRole("option", { name: /^noun\b/ }).click();
    await page.keyboard.press("Escape");
    await expect(dialog.getByLabel("Tags: noun", { exact: true })).toBeVisible();
  });

  await step("Write a hint from the chip at the row's end", async () => {
    await dialog.getByRole("button", { name: "Hint", exact: true }).click();
    await dialog.getByRole("textbox", { name: "Hint", exact: true }).fill(hint);
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
    expect(cards[0]).toMatchObject({
      deckId: deck.id,
      term,
      meaning: "the fog",
      notes: "c'è la nebbia",
      tags: ["noun"],
      hint,
      hintSource: "manual",
    });
    added = cards[0];
    return { card: cards[0] };
  });

  await step("It is still there after a reload", async () => {
    await page.reload();
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    return { total: await total() };
  });

  await step("Review the deck to the new card and peek at its hint", async () => {
    await page.goto(`/review?deck=${deck.id}`);
    const card = page.getByLabel(/ card for /);
    // The deck's few due cards come first in an order the clock decides, so grade them Good until it shows.
    for (let i = 0; i < 10; i++) {
      await expect(card).toBeVisible();
      if ((await card.getAttribute("aria-label"))?.endsWith(` card for ${term}`)) break;
      await page
        .getByRole("button", { name: "Reveal the card" })
        .click({ position: { x: 24, y: 24 } });
      await page.getByRole("button", { name: /^Good/ }).click();
    }
    await expect(card).toHaveAttribute("aria-label", new RegExp(` card for ${term}$`));
    await page.getByRole("button", { name: "Peek at your hint" }).click();
    await expect(card.getByRole("paragraph").filter({ hasText: hint })).toHaveText(`Hint: ${hint}`);
  });
}
