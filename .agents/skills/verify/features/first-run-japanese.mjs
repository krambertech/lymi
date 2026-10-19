export const title = "First run for a Japanese beginner";
export const persona = "fresh";
export const start = "/today";

const BEGINNER = [
  "Read Japanese Kana",
  "Japanese N5 Vocabulary Practice",
  "Japanese N4 Vocabulary",
  "Japanese Essentials",
];

export default async function drive({ page, step, api, expect }) {
  await step("Publish the Japanese decks and come back as a new account", async () => {
    // The publisher persona's seed publishes them locally; signing in again as fresh resets that account.
    const seeded = await page.request.get("/api/dev/sign-in?as=publisher&reset=1", {
      maxRedirects: 0,
    });
    expect(seeded.status()).toBeLessThan(400);
    await page.goto("/api/dev/sign-in?as=fresh&reset=1&returnTo=/today");
    await expect(page.getByRole("heading", { name: /^Welcome, / })).toBeVisible();
    const explore = await api("/api/explore");
    const japanese = explore.decks.filter((d) => d.language === "ja").map((d) => d.slug);
    expect(japanese).toContain("read-japanese-kana");
    return { japanese };
  });

  await step("Choose Japanese in the heading", async () => {
    await page.getByRole("combobox", { name: "What the decks are about" }).click();
    await page.getByRole("option", { name: /^Japanese/ }).click();
    await expect(page.getByRole("combobox", { name: "What the decks are about" })).toHaveText(
      /Japanese/,
    );
  });

  await step("The row offers kana, then N5, then N4, then Japanese Essentials", async () => {
    const row = page.getByRole("list", { name: "Ready-made decks" });
    const decks = row.getByRole("listitem");
    for (const [i, name] of BEGINNER.entries()) await expect(decks.nth(i)).toContainText(name);
    return { offered: (await decks.allInnerTexts()).map((t) => t.split("\n")[0]) };
  });

  await step("Add starts the kana deck's review", async () => {
    await page
      .getByRole("list", { name: "Ready-made decks" })
      .getByRole("listitem")
      .filter({ hasText: "Read Japanese Kana" })
      .getByRole("button", { name: "Add" })
      .click();
    await expect(page).toHaveURL(/\/review\?deck=/);
    const decks = await api("/api/decks");
    expect(decks.map((d) => d.name)).toContain("Read Japanese Kana");
    return { decks: decks.map((d) => d.name) };
  });
}
