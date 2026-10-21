export const title = "First run for a Chinese beginner";
export const persona = "fresh";
export const start = "/today";

const BEGINNER = ["Chinese HSK 1 Vocabulary", "Chinese HSK 2 Vocabulary", "Core Chinese Words"];

export default async function drive({ page, step, api, expect }) {
  await step("Publish the Chinese decks and come back as a new account", async () => {
    // The publisher persona's seed publishes them locally; signing in again as fresh resets that account.
    const seeded = await page.request.get("/api/dev/sign-in?as=publisher&reset=1", {
      maxRedirects: 0,
    });
    expect(seeded.status()).toBeLessThan(400);
    await page.goto("/api/dev/sign-in?as=fresh&reset=1&returnTo=/today");
    await expect(page.getByRole("heading", { name: /^Welcome to Lymi/ })).toBeVisible();
    const explore = await api("/api/explore");
    const chinese = explore.decks.filter((d) => d.language === "zh").map((d) => d.slug);
    expect(chinese).toContain("chinese-hsk-1-vocabulary");
    return { chinese };
  });

  await step("Choose Chinese in the heading", async () => {
    await page.getByRole("combobox", { name: "What the decks are about" }).click();
    await page.getByRole("option", { name: /^Chinese/ }).click();
    await expect(page.getByRole("combobox", { name: "What the decks are about" })).toHaveText(
      /Chinese/,
    );
  });

  await step("The row offers HSK 1, then HSK 2, then Core Chinese Words", async () => {
    const row = page.getByRole("list", { name: "Ready-made decks" });
    const decks = row.getByRole("listitem");
    for (const [i, name] of BEGINNER.entries()) await expect(decks.nth(i)).toContainText(name);
    return { offered: (await decks.allInnerTexts()).map((t) => t.split("\n")[0]) };
  });

  await step("Add starts HSK 1's review with pinyin over the hanzi", async () => {
    await page
      .getByRole("list", { name: "Ready-made decks" })
      .getByRole("listitem")
      .filter({ hasText: "Chinese HSK 1 Vocabulary" })
      .getByRole("button", { name: "Add" })
      .click();
    await expect(page).toHaveURL(/\/review\?deck=/);
    await expect(page.locator("ruby rt").first()).toBeVisible();
    const decks = await api("/api/decks");
    expect(decks.map((d) => d.name)).toContain("Chinese HSK 1 Vocabulary");
    return { decks: decks.map((d) => d.name) };
  });
}
