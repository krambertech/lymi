export const title = "First run for a Ukrainian beginner";
export const persona = "fresh";
export const start = "/today";

const BEGINNER = [
  "Read the Ukrainian Alphabet",
  "Ukrainian A1 Vocabulary",
  "Ukrainian A2 Vocabulary",
  "Core Ukrainian Words",
];

export default async function drive({ page, step, api, expect }) {
  await step("Publish the Ukrainian decks and come back as a new account", async () => {
    // The publisher persona's seed publishes them locally; signing in again as fresh resets that account.
    const seeded = await page.request.get("/api/dev/sign-in?as=publisher&reset=1", {
      maxRedirects: 0,
    });
    expect(seeded.status()).toBeLessThan(400);
    await page.goto("/api/dev/sign-in?as=fresh&reset=1&returnTo=/today");
    await expect(page.getByRole("heading", { name: /^Welcome to Lymi/ })).toBeVisible();
    const explore = await api("/api/explore");
    const ukrainian = explore.decks.filter((d) => d.language === "uk").map((d) => d.slug);
    expect(ukrainian).toContain("ukrainian-a1-vocabulary");
    return { ukrainian };
  });

  await step("Choose Ukrainian in the heading", async () => {
    await page.getByRole("combobox", { name: "What the decks are about" }).click();
    await page.getByRole("option", { name: /^Ukrainian/ }).click();
    await expect(page.getByRole("combobox", { name: "What the decks are about" })).toHaveText(
      /Ukrainian/,
    );
  });

  await step("The row offers the alphabet, then A1, A2 and Core Ukrainian Words", async () => {
    const row = page.getByRole("list", { name: "Ready-made decks" });
    const decks = row.getByRole("listitem");
    for (const [i, name] of BEGINNER.entries()) await expect(decks.nth(i)).toContainText(name);
    return { offered: (await decks.allInnerTexts()).map((t) => t.split("\n")[0]) };
  });

  await step("Add starts A1's review with the stress drawn on the cue", async () => {
    await page
      .getByRole("list", { name: "Ready-made decks" })
      .getByRole("listitem")
      .filter({ hasText: "Ukrainian A1 Vocabulary" })
      .getByRole("button", { name: "Add" })
      .click();
    await expect(page).toHaveURL(/\/review\?deck=/);
    // The New card's cue is its term with U+0301 over the stressed vowel.
    const cue = page
      .getByRole("region", { name: /Recognition card/ })
      .locator("p[lang='uk']")
      .filter({ visible: true })
      .first();
    await expect(cue).toHaveText(/\u0301/);
    const decks = await api("/api/decks");
    expect(decks.map((d) => d.name)).toContain("Ukrainian A1 Vocabulary");
    return { decks: decks.map((d) => d.name) };
  });
}
