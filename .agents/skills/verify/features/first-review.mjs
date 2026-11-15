export const title = "First review";
export const persona = "fresh";
export const start = "/today";

export default async function drive({ page, step, api, expect }) {
  const post = async (path, data) => {
    const response = await page.request.post(path, { data });
    if (!response.ok()) throw new Error(`POST ${path} answered HTTP ${response.status()}`);
    return response.json();
  };
  const reveal = page.getByRole("button", { name: "Reveal the card" });
  const good = page.getByRole("button", { name: /^Good/ });
  const next = page.getByRole("button", { name: "Next", exact: true });
  // The corner: on a phone the card's centre can land on the pronunciation button.
  const pressCard = () => reveal.click({ position: { x: 24, y: 24 } });

  await step("Give the fresh account a deck of two cards", async () => {
    const deck = await post("/api/decks", { name: "Italian", defaultLanguage: "it" });
    await post("/api/cards", { deckId: deck.id, term: "la mela", meaning: "the apple" });
    await post("/api/cards", { deckId: deck.id, term: "il pane", meaning: "the bread" });
    const streak = await api("/api/stats/streak");
    expect(streak.reviewedDays).toBe(0);
    return { reviewedDays: streak.reviewedDays };
  });

  await step("The first card says what to try", async () => {
    await page.goto("/review");
    await expect(page.getByText(/^Try to remember/)).toBeVisible();
  });

  await step("The first grade sends the card along the days ahead", async () => {
    await pressCard();
    await good.click();
    await expect(page.getByRole("heading", { name: /comes back/ })).toBeVisible();
    await page.getByRole("button", { name: "Next card" }).click();
  });

  await step("The last grade lands on the success screen", async () => {
    await pressCard();
    await good.click();
    await expect(
      page.getByRole("heading", { name: "You finished your first review" }),
    ).toBeVisible();
    await expect(page.getByText("You started your streak")).toBeVisible();
  });

  await step("Time a day saves on the tap", async () => {
    await next.click();
    await expect(page.getByRole("heading", { name: "How much time a day?" })).toBeVisible();
    await page.getByRole("radio", { name: /15 minutes/ }).click();
    await expect.poll(async () => (await api("/api/settings")).dailyGoal).toBe(50);
    return { dailyGoal: 50 };
  });

  await step("The end names the day and offers the ways on", async () => {
    await next.click();
    const notNow = page.getByRole("button", { name: "Not now" });
    const seeYou = page.getByRole("heading", { name: /^See you/ });
    await expect(notNow.or(seeYou).first()).toBeVisible();
    if (await notNow.isVisible()) await notNow.click();
    await expect(seeYou).toBeVisible();
    await expect(page.getByText("15 minutes a day")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add more cards" })).toBeVisible();
    await page.getByRole("link", { name: "Done" }).click();
    await expect(page).toHaveURL(/\/today/);
    return { reviews: (await api("/api/stats/streak")).today.attempts };
  });
}
