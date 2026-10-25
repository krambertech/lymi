export const title = "First run";
export const persona = "fresh";
export const start = "/today";

export default async function drive({ page, step, api, expect }) {
  await step("Today greets a new account with the guide and sets it up on 25", async () => {
    await expect(page.getByRole("heading", { name: /^Welcome(, | to Lymi$)/ })).toBeVisible();
    // The count shows from a wider screen; on a phone it is only in the page.
    await expect(page.getByText("0 of 3 done")).toBeAttached();
    await expect(page.getByRole("heading", { name: "Create your first deck" })).toBeVisible();
    await expect.poll(async () => (await api("/api/settings")).dailyGoal).toBe(25);
    const settings = await api("/api/settings");
    expect(settings.onboardedAt).toBeTruthy();
    return { onboardedAt: settings.onboardedAt, dailyGoal: settings.dailyGoal };
  });

  let deckId = "";
  await step("A ready-made deck chosen in the heading opens its first review", async () => {
    await page.getByRole("combobox", { name: "What the decks are about" }).click();
    await page.getByRole("option", { name: /^Finnish/ }).click();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Everyday Finnish" })
      .getByRole("button", { name: "Add" })
      .click();
    await expect(page).toHaveURL(/\/review\?deck=/);
    deckId = new URL(page.url()).searchParams.get("deck") ?? "";
    return { deckId };
  });

  await step("The learner finishes the first review", async () => {
    const done = page.getByRole("link", { name: "Done", exact: true });
    for (let i = 0; i < 30 && !(await done.isVisible()); i++) {
      const reveal = page.getByRole("button", { name: "Reveal the card" });
      if (await reveal.isVisible()) await reveal.click();
      const good = page.getByRole("button", { name: /^Good/ });
      if (await good.isVisible()) await good.click();
      await page.waitForTimeout(300);
    }
    await expect(done).toBeVisible();
    return { reviews: (await api("/api/stats/streak")).today.attempts };
  });

  await step("Back on Today the guide has gone", async () => {
    await page.goto("/today");
    await expect(page.getByRole("heading", { level: 1, name: "Today", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Welcome(, | to Lymi$)/ })).toHaveCount(0);
    return { deckId };
  });
}
