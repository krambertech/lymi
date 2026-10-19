import { join } from "node:path";

export const title = "Import from Pleco";
export const start = "/settings";

/** An invented Pleco text export: 9 cards under 3 categories, both scripts, tone numbers. */
const file = join(
  import.meta.dirname,
  "../../../../apps/web/src/server/imports/pleco/fixtures/both.txt",
);

export default async function drive({ page, step, api, expect }) {
  const { counts: seeded } = await api("/api/dev/state");

  await step("Open Import from Pleco from Settings", async () => {
    await page.getByRole("link", { name: /^Pleco\b/ }).click();
    await expect(
      page.getByRole("heading", { name: "Import from Pleco", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Export Cards", { exact: true })).toBeVisible();
  });

  await step("Choose the file; the card step says how to learn traditional", async () => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose file", exact: true }).click();
    await (await chooser).setFiles(file);
    await expect(page.getByRole("heading", { name: "Does this card look right?" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/make Traditional the term/)).toBeVisible();
    await expect(page.getByText("Pleco · 9 cards")).toBeVisible();
  });

  let count = 0;
  await step("The summary names the categories that become tags", async () => {
    await page.getByRole("button", { name: "Looks right", exact: true }).click();
    const ready = page.getByRole("heading", { name: /^Ready to import \d+ cards$/ });
    await expect(ready).toBeVisible();
    count = Number((await ready.textContent())?.match(/\d+/)?.[0]);
    expect([7, 9]).toContain(count);
    await expect(
      page.getByText(
        "Your 3 Pleco categories become tags: HSK 1, HSK 1/Verbs, and Bank words/Places. A card in several of them comes in once, with each tag.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText("This file has no review history, so every card starts as new."),
    ).toBeVisible();
  });

  await step("Import them and see them stored", async () => {
    await page.getByRole("button", { name: `Import ${count} cards`, exact: true }).click();
    await expect(page.getByRole("heading", { name: `Imported ${count} cards` })).toBeVisible({
      timeout: 60_000,
    });
    const { counts } = await api("/api/dev/state");
    expect(counts.cards).toBe(seeded.cards + count);
    const decks = await api("/api/decks");
    const deck = decks.find((d) => d.name === "Pleco flashcards");
    expect(deck?.defaultLanguage).toBe("zh");
    const rows = await api(`/api/decks/${deck.id}/cards`);
    const study = rows.map((row) => row.card).find((c) => c.term === "学习");
    expect(study).toMatchObject({ notes: "學習" });
    expect(study.tags).toEqual(["HSK 1/Verbs", "HSK 1"]);
    return {
      counts,
      study: {
        term: study.term,
        pronunciation: study.pronunciation,
        notes: study.notes,
        tags: study.tags,
      },
    };
  });

  await step("Library has the deck and Activity lists the import", async () => {
    await page.getByRole("link", { name: "Open Library", exact: true }).click();
    await expect(
      page.getByRole("main").getByText("Pleco flashcards", { exact: true }),
    ).toBeVisible();
    await page.goto("/activity");
    await expect(page.getByRole("main").getByText(/Pleco/).first()).toBeVisible();
  });
}
