import { join } from "node:path";

export const title = "Import a Japanese deck with recordings";
export const start = "/settings";

/** A Kaishi 1.5k-shaped package: term and sentence audio, pitch accent, a translation. */
const file = join(
  import.meta.dirname,
  "../../../../apps/web/src/server/imports/anki/fixtures/kaishi.apkg",
);

export default async function drive({ page, step, api, expect }) {
  await step("Choose the Kaishi-shaped package from Import from Anki", async () => {
    await page.getByRole("link", { name: /^Anki\b/ }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Choose file", exact: true }).click();
    await (await chooser).setFiles(file);
    const looksRight = page.getByRole("button", { name: "Looks right", exact: true });
    const ready = page.getByRole("heading", { name: /^Ready to import / });
    await expect(looksRight.or(ready)).toBeVisible({ timeout: 30_000 });
    while (await looksRight.isVisible()) {
      await looksRight.click();
      await expect(looksRight.or(ready)).toBeVisible();
    }
    await expect(ready).toHaveText("Ready to import 3 cards");
  });

  await step("The preview says which recordings come and what is left out", async () => {
    const main = page.getByRole("main");
    await expect(main.getByText(/^2 cards bring their recordings\./)).toBeVisible();
    await expect(main.getByText(/^1 recording is in a format Lymi can’t play/)).toBeVisible();
    await expect(main.getByText(/^2 clips are left out, such as sentence clips\./)).toBeVisible();
    await expect(main.getByText(/^1 card’s pitch accent can’t be read as text/)).toBeVisible();
  });

  await step("Import and see recordings stored", async () => {
    await page.getByRole("button", { name: "Import 3 cards", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Imported 3 cards" })).toBeVisible({
      timeout: 60_000,
    });
    const main = page.getByRole("main");
    await expect(main.getByText("2 recordings were imported.", { exact: true })).toBeVisible();
    await expect(main.getByText(/^1 recording couldn’t be read or played/)).toBeVisible();
    const decks = await api("/api/decks");
    const deck = decks.find((d) => d.name === "Kaishi 1.5k");
    const cards = await api(`/api/decks/${deck.id}/cards`);
    const list = cards.items ?? cards.cards ?? cards;
    const hashi = list.find((c) => (c.card ?? c).term === "箸");
    expect((hashi.card ?? hashi).notes).toBe("I eat with chopsticks.\nCounted with 膳\nはꜜし [1]");
    return { deck: deck.id, notes: list.map((c) => [(c.card ?? c).term, (c.card ?? c).notes]) };
  });

  await step("Review the deck and play a recording", async () => {
    // A media element's load is not a page response, so the step watches `play()` itself.
    await page.evaluate(() => {
      window.__played = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const entry = { src: this.src, ok: null };
        window.__played.push(entry);
        return play.call(this).then(
          () => {
            entry.ok = true;
          },
          (error) => {
            entry.ok = false;
            throw error;
          },
        );
      };
    });
    await page.getByRole("link", { name: "Open Library", exact: true }).click();
    await page
      .getByRole("main")
      .getByRole("link", { name: /^Kaishi 1\.5k\b/ })
      .click();
    await page.getByRole("main").getByRole("button", { name: "Review", exact: true }).click();
    const card = page.getByLabel(/ card for /);
    await expect(card).toBeVisible();
    const term = await card.getAttribute("aria-label");
    // The card in front never settles for Playwright's pointer checks, so play it by keyboard.
    await page
      .getByRole("button", { name: "Play pronunciation" })
      .filter({ visible: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => page.evaluate(() => window.__played.at(-1)?.ok ?? null)).toBe(true);
    const { src } = await page.evaluate(() => window.__played.at(-1));
    const clip = await page.request.get(src);
    expect(clip.status()).toBe(200);
    expect(clip.headers()["content-type"]).toBe("audio/mpeg");
    const cardId = src.split("/").pop();
    const stored = await api(`/api/cards/${cardId}`);
    const row = stored.card ?? stored;
    expect(row.audioKey).toMatch(/\/recorded\//);
    return {
      card: term,
      played: src.replace(/^.*\/api/, "/api"),
      type: clip.headers()["content-type"],
      audioKey: row.audioKey,
    };
  });
}
