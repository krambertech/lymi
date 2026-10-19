import { join } from "node:path";

export const title = "Import from Anki";
export const start = "/settings";

/** The repo's real Anki 26.09 export: 10 cards in 3 decks with 11 past reviews. */
const file = join(
  import.meta.dirname,
  "../../../../apps/web/src/server/imports/anki/fixtures/current.apkg",
);

export default async function drive({ page, step, api, expect }) {
  const { counts: seeded } = await api("/api/dev/state");

  await step("Open Import from Anki from Settings", async () => {
    await page.getByRole("link", { name: /^Anki\b/ }).click();
    await expect(
      page.getByRole("heading", { name: "Import from Anki", exact: true }),
    ).toBeVisible();
  });

  await step("Choose the file and keep every deck", async () => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose file", exact: true }).click();
    await (await chooser).setFiles(file);
    await expect(
      page.getByRole("heading", { name: "Which decks do you want in Lymi?" }),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  });

  const preview = "**/api/imports/*/preview";
  await step("A preview that cannot reach Lymi offers Try again", async () => {
    await page.route(preview, (route) => route.abort("failed"));
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("checkbox").last().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(/Couldn’t reach Lymi/);
    await expect(page.getByText("No card of this kind has a term.")).toBeHidden();
  });

  await step("Try again shows the card, then every deck is kept", async () => {
    await page.unroute(preview);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.getByRole("alert")).toBeHidden();
    await expect(page.getByRole("button", { name: "Looks right", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("checkbox").last().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  });

  let count = 0;
  await step("Confirm each kind of card looks right", async () => {
    const looksRight = page.getByRole("button", { name: "Looks right", exact: true });
    const ready = page.getByRole("heading", { name: /^Ready to import / });
    await expect(looksRight.or(ready)).toBeVisible();
    while (await looksRight.isVisible()) {
      await looksRight.click();
      await expect(looksRight.or(ready)).toBeVisible();
    }
    // One of the file's cards is already in the learner's decks, so it is skipped.
    await expect(ready).toHaveText("Ready to import 9 cards");
    count = 9;
  });

  await step("Import them and see them stored", async () => {
    await page.getByRole("button", { name: `Import ${count} cards`, exact: true }).click();
    await expect(page.getByRole("heading", { name: `Imported ${count} cards` })).toBeVisible({
      timeout: 60_000,
    });
    const { counts } = await api("/api/dev/state");
    // The suspended card arrives archived, so it is not among the active cards.
    expect(counts.cards).toBe(seeded.cards + count - 1);
    expect(counts.reviews).toBeGreaterThan(seeded.reviews);
    return { counts };
  });

  await step("Library has the new decks and Activity lists the import", async () => {
    await page.getByRole("link", { name: "Open Library", exact: true }).click();
    await expect(
      page.getByRole("main").getByText("Italian / Lesson 1", { exact: true }),
    ).toBeVisible();
    await page.goto("/activity");
    await expect(page.getByRole("main").getByText(/Anki/).first()).toBeVisible();
    const decks = await api("/api/decks");
    return { decks: decks.map(({ name, total }) => ({ name, total })) };
  });
}
