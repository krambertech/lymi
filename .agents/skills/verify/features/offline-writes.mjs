import { createDeck } from "./new-deck.mjs";

export const title = "Offline writes";
export const start = "/library";

const deckName = "Offline lesson";
const term = "la fretta";
/** Every write the outbox sends; reads still reach the server. */
const WRITES = /\/api\/(decks|cards)(\/[^?]*)?(\?.*)?$/;

const queued = (page) =>
  page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("lymi-writes:")).length);

export default async function drive({ page, step, api, expect }) {
  const named = async () => (await api("/api/decks")).find((d) => d.name === deckName) ?? null;

  await step("With writes cut off, make a deck and a card in it", async () => {
    await page.route(WRITES, (route) =>
      route.request().method() === "GET" ? route.fallback() : route.abort("internetdisconnected"),
    );
    await createDeck(page, expect, deckName);
    await page.keyboard.press("n");
    const add = page.getByRole("dialog", { name: "Add a card" });
    await add.getByRole("textbox", { name: "Term", exact: true }).fill(term);
    await add.getByRole("textbox", { name: "Meaning", exact: true }).fill("the hurry");
    await add.getByRole("button", { name: `Add to ${deckName}`, exact: true }).click();
    await expect(page.getByRole("region", { name: "Notifications" })).toContainText(
      "saved on this device",
    );
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    expect(await named()).toBeNull();
    return { server: null, queued: await queued(page) };
  });

  await step("After a reload that cannot send them, both are still on screen", async () => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: deckName })).toBeVisible();
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    expect(await named()).toBeNull();
    return { server: null, queued: await queued(page) };
  });

  await step("Once the connection returns, they reach the server in order", async () => {
    await page.unroute(WRITES);
    await page.reload();
    await expect.poll(async () => (await named())?.total ?? -1).toBe(1);
    await expect.poll(() => queued(page)).toBe(0);
    await expect(page.getByText(term, { exact: true })).toBeVisible();
    const deck = await named();
    const { cards } = await api(`/api/cards?term=${encodeURIComponent(term)}`);
    return { deck: { id: deck.id, total: deck.total }, cards: cards.map((c) => c.deckId) };
  });
}
