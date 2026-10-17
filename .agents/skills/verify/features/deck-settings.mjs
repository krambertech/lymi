export const title = "Deck settings";
export const start = "/library";

const renamed = "Lezione 12, errands";
const instructions = "Everyday Italian for running errands.";

export default async function drive({ page, step, api, expect }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const stored = async () => (await api("/api/decks")).find((d) => d.id === deck.id);
  const main = page.getByRole("main");

  await step("Open Lezione 12's settings", async () => {
    await page.goto(`/library/${deck.id}/settings`);
    await expect(main.getByRole("heading", { level: 1, name: "Deck settings" })).toBeVisible();
    await expect(main.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(deck.name);
    return deck;
  });

  await step("Rename it and leave the field", async () => {
    const name = main.getByRole("textbox", { name: "Name", exact: true });
    await name.fill(renamed);
    await name.press("Tab");
    await expect.poll(async () => (await stored()).name).toBe(renamed);
    return stored();
  });

  await step("Ask its cards both ways", async () => {
    const bothWays = main.getByRole("radio", { name: "Both ways" });
    await bothWays.click();
    await expect(bothWays).toBeChecked();
    await expect.poll(async () => (await stored()).directions).toBe("both");
    return stored();
  });

  await step("Let AI fill notes and give it instructions", async () => {
    // The checkbox flips once the saved deck comes back, so click and wait rather than check().
    const notes = main.getByRole("checkbox", { name: "Notes", exact: true });
    await notes.click();
    await expect(notes).toBeChecked();
    const box = main.getByRole("textbox", { name: "Instructions", exact: true });
    await box.fill(instructions);
    await box.press("Tab");
    await expect.poll(async () => (await stored()).enrichFields).toContain("notes");
    await expect.poll(async () => (await stored()).enrichInstructions).toBe(instructions);
    return stored();
  });

  await step("After a reload the page shows what was saved", async () => {
    await page.reload();
    await expect(main.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(renamed);
    await expect(main.getByRole("radio", { name: "Both ways" })).toBeChecked();
    await expect(main.getByRole("checkbox", { name: "Notes", exact: true })).toBeChecked();
    await expect(main.getByRole("textbox", { name: "Instructions", exact: true })).toHaveValue(
      instructions,
    );
    await expect(main.getByRole("link", { name: renamed })).toBeVisible();
    return stored();
  });
}
