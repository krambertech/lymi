export const title = "Review";
export const start = "/today";

/** Wait for the grade outbox to reach the server: the review count is the stored proof. */
async function reviewsReach(api, expect, count) {
  await expect.poll(async () => (await api("/api/dev/state")).counts.reviews).toBe(count);
  return (await api("/api/dev/state")).counts;
}

export default async function drive({ page, step, api, expect }) {
  const { counts: seeded } = await api("/api/dev/state");
  const card = page.getByLabel(/ card for /);

  await step("Open Today with the learner's 9 due cards", async () => {
    await expect(page.getByRole("heading", { name: "9 cards due today" })).toBeVisible();
    return seeded;
  });

  await step("Start the review from Today", async () => {
    await page
      .getByRole("region", { name: "Today" })
      .getByRole("link", { name: /^Review/ })
      .click();
    await expect(card).toBeVisible();
    await expect(page.getByText("0 of 9", { exact: true })).toBeVisible();
  });

  await step("Reveal the first card and grade it Good", async () => {
    const first = await card.getAttribute("aria-label");
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText("1 of 9", { exact: true })).toBeVisible();
    await expect(card).not.toHaveAttribute("aria-label", first ?? "");
    return reviewsReach(api, expect, seeded.reviews + 1);
  });

  await step("Grade the second card Forgot", async () => {
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await page.getByRole("button", { name: /^Forgot/ }).click();
    await expect(page.getByText(/^2 of \d+$/)).toBeVisible();
    return reviewsReach(api, expect, seeded.reviews + 2);
  });

  await step("Back on Today, the forgotten card is listed and the due count fell", async () => {
    await page.goto("/today");
    await expect(page.getByRole("link", { name: /^1\s+Forgotten today\b/ })).toBeVisible();
    const { counts } = await api("/api/dev/state");
    expect(counts.due).toBeLessThan(seeded.due);
    return counts;
  });
}
