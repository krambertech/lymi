import { join } from "node:path";

export const title = "Import an HSK-shaped Chinese Anki deck";
export const start = "/settings";

/** An invented package shaped like HSK decks: both scripts, tone-colour pinyin, sentence pinyin, recordings. */
const file = join(
  import.meta.dirname,
  "../../../../apps/web/src/server/imports/anki/fixtures/hsk.apkg",
);

export default async function drive({ page, step, api, expect }) {
  const main = page.getByRole("main");
  const looksRight = page.getByRole("button", { name: "Looks right", exact: true });
  const ready = page.getByRole("heading", { name: /^Ready to import / });

  await step("Choose the HSK-shaped package from Import from Anki", async () => {
    await page.getByRole("link", { name: /^Anki\b/ }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose file", exact: true }).click();
    await (await chooser).setFiles(file);
    // Three decks ask which to keep first.
    const decks = page.getByRole("button", { name: "Continue", exact: true });
    await expect(decks).toBeVisible({ timeout: 30_000 });
    await decks.click();
    await expect(looksRight.or(ready)).toBeVisible();
    while (await looksRight.isVisible()) {
      await looksRight.click();
      await expect(looksRight.or(ready)).toBeVisible();
    }
    await expect(ready).toHaveText("Ready to import 9 cards");
  });

  await step("The preview reads the HSK and TOCFL decks as Chinese from their fields", async () => {
    await expect(main.getByText(/^6 cards bring their recordings\./)).toBeVisible();
    await main.getByRole("button", { name: "Change languages", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Languages" });
    await expect(dialog).toBeVisible();
    const text = await dialog.innerText();
    expect(text).toMatch(/HSK \/ HSK 1[\s\S]*Chinese/);
    expect(text).toMatch(/TOCFL[\s\S]*Chinese/);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    return { languages: text };
  });

  await step("Import and see pinyin Readings, notes and recordings stored", async () => {
    await page.getByRole("button", { name: "Import 9 cards", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Imported 9 cards" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(main.getByText("6 recordings were imported.", { exact: true })).toBeVisible();
    const decks = await api("/api/decks");
    const deck = decks.find((d) => d.name === "HSK / HSK 1" || d.name === "HSK::HSK 1");
    expect(deck?.defaultLanguage).toBe("zh");
    const rows = await api(`/api/decks/${deck.id}/cards`);
    const list = (rows.items ?? rows.cards ?? rows).map((row) => row.card ?? row);
    const byTerm = (term) => list.find((c) => c.term === term);
    const bank = byTerm("银行");
    expect(bank.pronunciation).toBe("yínháng");
    expect(bank.notes.startsWith("銀行\nnoun\n我去銀行。\n")).toBe(true);
    // Inline once Chinese examples draw pinyin, a notes line until then.
    const inline = bank.example === "我[Wǒ]去[qù]银行[yín háng]。";
    expect(inline || (bank.example === "我去银行。" && bank.notes.includes("Wǒ qù yínháng."))).toBe(
      true,
    );
    expect(byTerm("东西").pronunciation).toBe("dōng xi");
    expect(byTerm("你好")).toMatchObject({ pronunciation: "nǐ hǎo", notes: null });
    expect(byTerm("行").pronunciation).toBe("xíng / háng");
    expect(byTerm("很").notes).not.toMatch(/很好。\n|Wo3/);
    for (const card of list.filter((c) => c.term !== "行")) {
      expect(card.audioKey).toMatch(/\/recorded\//);
    }
    return {
      deck: deck.id,
      cards: list.map((c) => ({
        term: c.term,
        pronunciation: c.pronunciation,
        example: c.example,
        notes: c.notes,
        audioKey: c.audioKey,
      })),
    };
  });

  await step("The deck page draws pinyin over the term", async () => {
    await page.getByRole("link", { name: "Open Library", exact: true }).click();
    await main.getByRole("link", { name: /HSK 1/ }).first().click();
    // Pinyin over each character splits the row's name: 银 行.
    await expect(main.getByRole("button", { name: "New 银 行 bank" })).toBeVisible();
    await expect(main.getByText("yín", { exact: true })).toBeVisible();
  });

  await step("The card shows its example and notes", async () => {
    await main.getByRole("button", { name: "New 银 行 bank" }).click();
    await expect(page.getByText("I am going to the bank.", { exact: false })).toBeVisible();
    await expect(page.getByText(/^銀行/)).toBeVisible();
  });
}
