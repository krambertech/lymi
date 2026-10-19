export const title = "Select cards";
export const start = "/library";
export const persona = "heavy";

const tag = "whole deck";

export default async function drive({ page, step, api, expect }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Suomi 1–24");
  const cards = () => api(`/api/decks/${deck.id}/cards`);
  const count = deck.total.toLocaleString("en");
  const main = page.getByRole("main");

  const selectAll = async () => {
    await page.getByRole("button", { name: "Deck options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Select cards", exact: true }).click();
    await page.getByRole("button", { name: "Select all", exact: true }).click();
    await expect(main.getByText(`${count} selected`, { exact: true })).toBeVisible();
  };

  await step("Select every card of a deck far past one bulk call", async () => {
    await page.goto(`/library/${deck.id}`);
    await expect(main.getByRole("heading", { level: 1, name: deck.name })).toBeVisible();
    await selectAll();
    return { deck: deck.name, total: deck.total };
  });

  await step("Tags… puts a new tag on every chosen card", async () => {
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Tags…", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Find or create a tag" }).fill(tag);
    await dialog.getByRole("textbox", { name: "Find or create a tag" }).press("Enter");
    await expect(dialog.getByRole("checkbox", { name: tag })).toBeChecked();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(`Changed the tags on ${count} cards`)).toBeVisible({
      timeout: 60_000,
    });
    await expect
      .poll(async () => (await cards()).filter((r) => r.card.tags.includes(tag)).length, {
        timeout: 60_000,
      })
      .toBe(deck.total);
    return { tag, tagged: deck.total };
  });

  await step("Move to section… moves every chosen card to one section", async () => {
    const { sections } = await api(`/api/decks/${deck.id}/sections`);
    const first = sections.find((s) => s.name === "Lesson 1");
    await selectAll();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Move to section…", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Lesson 1", exact: true }).click();
    await expect(page.getByText(`Moved ${count} cards to Lesson 1`)).toBeVisible({
      timeout: 60_000,
    });
    await expect
      .poll(async () => (await cards()).filter((r) => r.card.sectionId === first.id).length, {
        timeout: 60_000,
      })
      .toBe(deck.total);
    return { section: first.name, moved: deck.total };
  });

  await step("Mark important marks every chosen card", async () => {
    await selectAll();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Mark important", exact: true }).click();
    await expect(page.getByText(`Marked ${count} cards important`)).toBeVisible({
      timeout: 60_000,
    });
    await expect
      .poll(async () => (await cards()).filter((r) => r.card.important).length, {
        timeout: 60_000,
      })
      .toBe(deck.total);
    return { marked: deck.total };
  });

  const other = (await api("/api/decks")).find((d) => d.name === "Finnish cases");
  const total = async (id) => (await api("/api/decks")).find((d) => d.id === id).total;

  await step("Move to deck… moves every chosen card, and Undo brings them back", async () => {
    await selectAll();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Move to deck…", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: other.name }).click();
    const moved = page.getByText(`Moved ${count} cards to ${other.name}`);
    await expect(moved).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => total(other.id), { timeout: 60_000 }).toBe(other.total + deck.total);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect.poll(() => total(deck.id), { timeout: 60_000 }).toBe(deck.total);
    return { to: other.name, moved: deck.total, back: await total(deck.id) };
  });

  await step("Archive archives every chosen card, and Undo restores them", async () => {
    await expect(main.getByRole("heading", { level: 1, name: deck.name })).toBeVisible();
    await expect.poll(async () => (await cards()).length, { timeout: 60_000 }).toBe(deck.total);
    await selectAll();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await expect(page.getByText(`Archived ${count} cards`)).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => total(deck.id), { timeout: 60_000 }).toBe(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect.poll(() => total(deck.id), { timeout: 60_000 }).toBe(deck.total);
    return { archived: deck.total, restored: await total(deck.id) };
  });
}
