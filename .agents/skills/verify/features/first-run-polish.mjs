export const title = "First run for a Polish beginner";
export const persona = "fresh";
export const start = "/today";

const BEGINNER = [
  "Polish A1 Vocabulary",
  "Polish A2 Vocabulary",
  "Core Polish Words",
  "Polish for Offices and Paperwork",
];

export default async function drive({ page, step, api, expect }) {
  await step("Publish the Polish decks and come back as a new account", async () => {
    // The publisher persona's seed publishes them locally; signing in again as fresh resets that account.
    const seeded = await page.request.get("/api/dev/sign-in?as=publisher&reset=1", {
      maxRedirects: 0,
    });
    expect(seeded.status()).toBeLessThan(400);
    await page.goto("/api/dev/sign-in?as=fresh&reset=1&returnTo=/today");
    await expect(page.getByRole("heading", { name: /^Welcome to Lymi/ })).toBeVisible();
    const explore = await api("/api/explore");
    const polish = explore.decks.filter((d) => d.language === "pl").map((d) => d.slug);
    expect(polish).toContain("polish-a1-vocabulary");
    return { polish };
  });

  await step("Choose Polish in the heading", async () => {
    await page.getByRole("combobox", { name: "What the decks are about" }).click();
    await page.getByRole("option", { name: /^Polish/ }).click();
    await expect(page.getByRole("combobox", { name: "What the decks are about" })).toHaveText(
      /Polish/,
    );
  });

  await step("The row offers A1, then A2, Core Polish Words and the office deck", async () => {
    const row = page.getByRole("list", { name: "Ready-made decks" });
    const decks = row.getByRole("listitem");
    for (const [i, name] of BEGINNER.entries()) await expect(decks.nth(i)).toContainText(name);
    return { offered: (await decks.allInnerTexts()).map((t) => t.split("\n")[0]) };
  });

  await step("Add starts A1's review with no stress drawn on the cue", async () => {
    await page
      .getByRole("list", { name: "Ready-made decks" })
      .getByRole("listitem")
      .filter({ hasText: "Polish A1 Vocabulary" })
      .getByRole("button", { name: "Add" })
      .click();
    await expect(page).toHaveURL(/\/review\?deck=/);
    const cue = page
      .getByRole("region", { name: /card/ })
      .locator("p[lang='pl']")
      .filter({ visible: true })
      .first();
    await expect(cue).toBeVisible();
    await expect(cue).not.toHaveText(/[̀́]|ù/);
    const decks = await api("/api/decks");
    expect(decks.map((d) => d.name)).toContain("Polish A1 Vocabulary");
    return { cue: await cue.innerText(), decks: decks.map((d) => d.name) };
  });
}
