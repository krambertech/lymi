import { expect, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

/** Nine consecutive backdated days. A run counted from a seven-day window would say 7. */
test("the streak is exact beyond the seven days the lights show", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await signInAsTestLearner(page, testInfo, "core-learning");
  const post = async (path: string, data: unknown) => {
    const res = await page.request.post(path, { data });
    expect(res.ok(), `${path} failed with ${res.status()}`).toBeTruthy();
    return res.json();
  };
  const deck = (
    (await post("/api/decks", { name: "Lesson 14", defaultLanguage: "it" })) as { id: string }
  ).id;
  await post("/api/cards/batch", {
    cards: Array.from({ length: 12 }, (_, i) => ({
      deckId: deck,
      term: `parola ${i}`,
      meaning: `m${i}`,
    })),
  });
  const queue = (await (await page.request.get("/api/review/queue")).json()) as {
    items: { card: { id: string }; direction: string }[];
  };
  for (let back = 8; back >= 0; back--) {
    const when = new Date();
    when.setDate(when.getDate() - back);
    when.setHours(19, 30, 0, 0);
    const item = queue.items[back % queue.items.length];
    if (!item) throw new Error("no card");
    await post("/api/review/grade", {
      cardId: item.card.id,
      direction: item.direction,
      rating: 3,
      reviewedAt: when.toISOString(),
    });
  }
  const hist = (await (
    await page.request.get(`/api/review/history?days=7&tz=${new Date().getTimezoneOffset()}`)
  ).json()) as { days: number[]; streak: number };
  expect(hist.days).toHaveLength(7);
  expect(hist.streak).toBe(9);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/today");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("9 days in a row")).toBeVisible();
  const lights = page.getByRole("img", { name: /Reviewed on 7 of the last 7 days: / });
  await expect(lights).toBeVisible();
});
