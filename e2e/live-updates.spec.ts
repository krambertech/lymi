import { startAsTestLearner } from "./auth";
import { expect, test } from "./test";

/**
 * A deck left open shows what lands in it from elsewhere, without a reload: a card added through
 * the API, as an assistant or another device would, and then one archived. ADR 0024.
 */
test("an open deck shows cards added and archived elsewhere", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "live-updates");
  const made = await page.request.post("/api/decks", {
    data: { name: "Live deck", defaultLanguage: "it" },
  });
  expect(made.ok()).toBeTruthy();
  const deckId = ((await made.json()) as { id: string }).id;
  const first = await page.request.post("/api/cards", {
    data: { deckId, term: "magari", meaning: "if only", language: "it" },
  });
  expect(first.ok()).toBeTruthy();

  const frames: string[] = [];
  page.on("websocket", (ws) => {
    if (ws.url().includes("/api/live"))
      ws.on("framereceived", (f) => frames.push(String(f.payload)));
  });
  await page.goto(`/library/${deckId}`);
  await expect(page.getByText("magari", { exact: true })).toBeVisible();
  // The channel greets the tab once it holds its socket, so the next change reaches it.
  await expect.poll(() => frames.some((frame) => frame.includes('"hello"'))).toBe(true);
  await page.evaluate(() => {
    (window as { stayed?: boolean }).stayed = true;
  });

  let cardId = "";
  await test.step("a card added elsewhere appears", async () => {
    const added = await page.request.post("/api/cards", {
      data: { deckId, term: "sbrigarsi", meaning: "to hurry", language: "it" },
    });
    expect(added.ok()).toBeTruthy();
    cardId = ((await added.json()) as { card: { id: string } }).card.id;
    await expect(page.getByText("sbrigarsi", { exact: true })).toBeVisible();
  });

  await test.step("a card archived elsewhere leaves", async () => {
    const archived = await page.request.post(`/api/cards/${cardId}/archive`);
    expect(archived.ok()).toBeTruthy();
    await expect(page.getByText("sbrigarsi", { exact: true })).toHaveCount(0);
  });

  expect(await page.evaluate(() => (window as { stayed?: boolean }).stayed)).toBe(true);
});
