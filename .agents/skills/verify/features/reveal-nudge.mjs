export const title = "Reveal nudge";
export const persona = "fresh";
export const start = "/library";

// The nudge is aria-hidden, since the card's own name already says how to reveal, so it is found by its text.
const NUDGE = /then (tap to reveal|reveal the answer)/i;

async function reviewedDays(page) {
  const response = await page.request.get("/api/stats/streak?tz=UTC");
  return (await response.json()).reviewedDays;
}

export default async function drive({ page, step, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(path, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };

  await step("Give the fresh account a deck of two cards", async () => {
    const deck = await post("/api/decks", { name: "Italian" });
    await post("/api/cards", { deckId: deck.id, term: "la mela", meaning: "the apple" });
    await post("/api/cards", { deckId: deck.id, term: "il pane", meaning: "the bread" });
    const days = await reviewedDays(page);
    expect(days).toBe(0);
    return { reviewedDays: days };
  });

  await step("A newer learner's first card shows the nudge after a second", async () => {
    await page.goto("/review");
    await expect(page.getByRole("button", { name: "Reveal the card" })).toBeVisible();
    await expect(page.getByText(NUDGE).filter({ visible: true })).toBeVisible({ timeout: 5_000 });
  });

  await step("A learner with weeks of reviews never sees it, even on a new browser", async () => {
    await page.goto("/api/dev/sign-in?as=learner&reset=1&returnTo=/review");
    await page.evaluate(() => localStorage.removeItem("lymi-reveals"));
    await page.reload();
    await expect(page.getByRole("button", { name: "Reveal the card" })).toBeVisible();
    // Past the second a first card on this browser used to wait.
    await page.waitForTimeout(3_000);
    await expect(page.getByText(NUDGE)).toHaveCount(0);
    const days = await reviewedDays(page);
    expect(days).toBeGreaterThanOrEqual(3);
    return { reviewedDays: days };
  });
}
