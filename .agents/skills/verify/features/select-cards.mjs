export const title = "Select cards";
export const start = "/library";
export const persona = "heavy";

const tag = "whole deck";

export default async function drive({ page, step, api, expect }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Suomi 1–24");
  const cards = () => api(`/api/decks/${deck.id}/cards`);
  const count = deck.total.toLocaleString("en");
  const main = page.getByRole("main");
  const chosen = main.getByText(`${count} selected`, { exact: true });
  const picker = page.getByRole("dialog", { name: `Move ${count} cards to` });
  // Toasts stack and each is a dialog named by its message, so Undo is taken from the right one.
  const undo = (message) =>
    page.getByRole("dialog", { name: message }).getByRole("button", { name: "Undo", exact: true });

  const selectAll = async () => {
    await page.getByRole("button", { name: "Deck options", exact: true }).click();
    await page.getByRole("menuitem", { name: "Select cards", exact: true }).click();
    await page.getByRole("button", { name: "Select all", exact: true }).click();
    await expect(chosen).toBeVisible();
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
    const dialog = page.getByRole("dialog", { name: `Tags for ${count} cards` });
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

  await step("Move to section… moves the cards Tags… left chosen to one section", async () => {
    const { sections } = await api(`/api/decks/${deck.id}/sections`);
    const first = sections.find((s) => s.name === "Lesson 1");
    await expect(chosen).toBeVisible();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Move to section…", exact: true }).click();
    await picker.getByRole("button", { name: "Lesson 1", exact: true }).click();
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

  await step("Mark important marks every card still chosen", async () => {
    await expect(chosen).toBeVisible();
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

  await step(
    "Move to deck… moves every chosen card and ends the selection, and Undo brings them back",
    async () => {
      await expect(chosen).toBeVisible();
      await page.getByRole("button", { name: "Actions", exact: true }).click();
      await page.getByRole("menuitem", { name: "Move to deck…", exact: true }).click();
      await picker.getByRole("button", { name: other.name }).click();
      const moved = `Moved ${count} cards to ${other.name}`;
      await expect(page.getByText(moved)).toBeVisible({ timeout: 60_000 });
      await expect(chosen).toBeHidden();
      await expect.poll(() => total(other.id), { timeout: 60_000 }).toBe(other.total + deck.total);
      await undo(moved).click();
      await expect.poll(() => total(deck.id), { timeout: 60_000 }).toBe(deck.total);
      // Undo puts each card back in the section it left, which step 3 made Lesson 1 for all of them.
      const { sections } = await api(`/api/decks/${deck.id}/sections`);
      const first = sections.find((s) => s.name === "Lesson 1");
      await expect
        .poll(async () => (await cards()).filter((r) => r.card.sectionId === first.id).length, {
          timeout: 60_000,
        })
        .toBe(deck.total);
      return { to: other.name, moved: deck.total, back: await total(deck.id), section: first.name };
    },
  );

  await step("Archive archives every chosen card, and Undo restores them", async () => {
    await expect(main.getByRole("heading", { level: 1, name: deck.name })).toBeVisible();
    await expect.poll(async () => (await cards()).length, { timeout: 60_000 }).toBe(deck.total);
    await selectAll();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
    await expect(page.getByText(`Archived ${count} cards`)).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => total(deck.id), { timeout: 60_000 }).toBe(0);
    await undo(`Archived ${count} cards`).click();
    await expect.poll(() => total(deck.id), { timeout: 60_000 }).toBe(deck.total);
    return { archived: deck.total, restored: await total(deck.id) };
  });
}
