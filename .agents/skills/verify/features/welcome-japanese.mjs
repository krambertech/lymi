export const title = "Welcome for a Japanese beginner";
export const persona = "fresh";
export const start = "/welcome";

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
    await page.goto("/api/dev/sign-in?as=fresh&reset=1&returnTo=/welcome");
    await expect(page.getByRole("heading", { name: "Welcome to Lymi" })).toBeVisible();
    const explore = await api("/api/explore");
    const japanese = explore.decks.filter((d) => d.language === "ja").map((d) => d.slug);
    expect(japanese).toContain("read-japanese-kana");
    return { japanese };
  });

  await step("Choose A language, then Japanese", async () => {
    const main = page.getByRole("main");
    await main.getByRole("button", { name: "Continue", exact: true }).click();
    await main.getByRole("radio", { name: /A language/ }).click();
    await main.getByRole("button", { name: "Continue", exact: true }).click();
    await main
      .getByRole("radiogroup", { name: "Language" })
      .getByRole("radio", { name: "Japanese" })
      .click();
    await main.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(main.getByRole("heading", { name: /How much time a day/ })).toBeVisible();
    await main.getByRole("button", { name: "Continue", exact: true }).click();
  });

  await step("The start step offers kana, then N5, then N4, then Japanese Essentials", async () => {
    const decks = page.getByRole("main").getByRole("radiogroup", { name: "Ready-made decks" });
    const radios = decks.getByRole("radio");
    await expect(radios).toHaveCount(BEGINNER.length);
    for (const [i, name] of BEGINNER.entries()) await expect(radios.nth(i)).toContainText(name);
    return { offered: await radios.allInnerTexts() };
  });

  await step("Add and review starts the kana deck", async () => {
    const main = page.getByRole("main");
    await main
      .getByRole("radiogroup", { name: "Ready-made decks" })
      .getByRole("radio", { name: /Read Japanese Kana/ })
      .click();
    await main.getByRole("button", { name: "Add and review", exact: true }).click();
    await expect(page).toHaveURL(/\/review/);
    const decks = await api("/api/decks");
    expect(decks.map((d) => d.name)).toContain("Read Japanese Kana");
    const settings = await api("/api/settings");
    expect(settings.learningLanguage).toBe("ja");
    return { decks: decks.map((d) => d.name), learningLanguage: settings.learningLanguage };
  });
}
