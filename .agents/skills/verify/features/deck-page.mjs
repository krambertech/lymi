export const title = "Library and the deck page";
export const start = "/library";

export default async function drive({ page, step, api, expect }) {
  const decks = await api("/api/decks");
  const deck = decks.find((d) => d.name === "Lezione 12");
  const rows = page.getByRole("main").getByRole("listitem").getByRole("button");

  await step("Library lists the learner's three decks with their counts", async () => {
    await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();
    const cards = decks.reduce((n, d) => n + d.total, 0);
    await expect(page.getByText(`${decks.length} decks · ${cards} cards`)).toBeVisible();
    for (const d of decks) {
      await expect(
        page.getByRole("main").getByRole("link", { name: new RegExp(`^${d.name}\\b`) }),
      ).toBeVisible();
    }
    return { decks: decks.map(({ id, name, total, due }) => ({ id, name, total, due })) };
  });

  await step("The deck page lists every card in Lezione 12", async () => {
    await page
      .getByRole("main")
      .getByRole("link", { name: /^Lezione 12\b/ })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: "Lezione 12" })).toBeVisible();
    await expect(rows).toHaveCount(deck.total);
    return { deck: { id: deck.id, total: deck.total, due: deck.due } };
  });

  await step("Filtering to Due today leaves the deck's due cards", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemradio", { name: "Due today", exact: true }).click();
    await page.keyboard.press("Escape");
    if (deck.due > 0) await expect(rows).toHaveCount(deck.due);
    else
      await expect(page.getByText("No cards match these filters", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove filter: Due today", exact: true }).click();
    await expect(rows).toHaveCount(deck.total);
  });

  await step("Opening a card shows its term and meaning", async () => {
    const { cards } = await api(`/api/cards?deckId=${deck.id}&limit=100`);
    const first = await rows.first().innerText();
    const card = cards.find((c) => first.includes(c.term));
    await rows.first().click();
    await expect(page.getByRole("heading", { name: card.term })).toBeVisible();
    await expect(page.getByText(card.meaning, { exact: true }).first()).toBeVisible();
    return { card: { id: card.id, term: card.term, meaning: card.meaning } };
  });

  await step("Filtering by a tag counts its cards and how many are due", async () => {
    const rowsApi = await api(`/api/decks/${deck.id}/cards`);
    const tagged = rowsApi.filter((r) => r.card.tags.some((t) => t.toLowerCase() === "money"));
    const now = new Date();
    const dayStart = new Date(now).setHours(0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    const waiting = tagged.filter(
      (r) =>
        r.state &&
        r.state.state !== 0 &&
        !(r.state.lastReview && new Date(r.state.lastReview).getTime() >= dayStart),
    );
    const due = waiting.filter((r) => new Date(r.state.due).getTime() < dayEnd).length;
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: /^money\b/ }).click();
    await page.keyboard.press("Escape");
    await expect(rows).toHaveCount(tagged.length);
    await expect(page.getByText(`${tagged.length} cards`, { exact: true })).toBeVisible();
    if (due > 0) {
      await expect(page.getByText(`${due} due today`, { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: `Review ${due} due` })).toBeVisible();
    } else await expect(page.getByText("None due today", { exact: true })).toBeVisible();
    return { tag: "money", cards: tagged.length, started: waiting.length, due };
  });

  await step("A search with no match says so in the list's place, and clears", async () => {
    await page.getByRole("button", { name: "Remove filter: Tag: money", exact: true }).click();
    // On a phone the field waits behind the top bar's search button.
    const field = page.getByRole("textbox", { name: "Search this deck" });
    if (!(await field.isVisible())) {
      await page.getByRole("button", { name: "Search this deck", exact: true }).click();
    }
    await field.fill("zzz");
    await expect(page.getByRole("heading", { name: "No cards match “zzz”" })).toBeVisible();
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(rows).toHaveCount(deck.total);
  });

  await step("Another deck opens without this deck's filters", async () => {
    const other = decks.find((d) => d.id !== deck.id);
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "Known", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Remove filter: Known" })).toBeVisible();
    await page.goto(`/library/${other.id}`);
    await expect(page.getByRole("heading", { level: 1, name: other.name })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Remove filter/ })).toHaveCount(0);
    await page.goto(`/library/${deck.id}`);
    await expect(page.getByRole("button", { name: /^Remove filter/ })).toHaveCount(0);
    return { other: { id: other.id, name: other.name } };
  });

  await step("Review all takes the filter's started cards as a round", async () => {
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("menuitemcheckbox", { name: "Known", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Review all", exact: true }).click();
    await expect(page).toHaveURL(/\/review\?deck=.*filter=/);
    await expect(page.getByLabel(/ card for /)).toBeVisible();
    const filter = new URL(page.url()).searchParams.get("filter");
    const queue = await api(
      `/api/review/queue?deck=${deck.id}&filter=${encodeURIComponent(filter ?? "")}`,
    );
    // The header's count is read aloud as a sentence; the visible "0/N" is hidden from it.
    await expect(page.getByText(`0 of ${queue.total}`, { exact: true })).toBeAttached();
    return { queue: { total: queue.total } };
  });
}
