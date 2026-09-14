import { expect, test } from "@playwright/test";

const publicSite = "http://localhost:4174";

test("a language learner can reach the languages pages and turn notes and cards over", async ({
  page,
  request,
}) => {
  await test.step("the landing page's language use case opens the languages page", async () => {
    await page.goto(publicSite);
    await page.getByRole("link", { name: "Lymi for language learning", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/languages/?$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Keep what you learn in any language." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/languages",
    );
  });

  await test.step("a photo of the notes turns into cards, skipping the one already kept", async () => {
    await page.getByRole("button", { name: "Take a photo", exact: true }).click();
    await expect(page.getByText("3 cards added")).toBeVisible();
    await expect(page.getByText("Already in your deck, so it’s skipped")).toBeVisible();
  });

  await test.step("the hand turns over and deals the next card", async () => {
    const hand = page.getByRole("region", { name: "Turn a few cards over" });
    const turn = hand.getByRole("button", { name: "Turn it over" });
    await expect(turn).not.toHaveAttribute("aria-disabled");
    await turn.click();
    await hand.getByRole("button", { name: "Next card" }).click();
    await expect(hand.getByText("1 turned")).toBeVisible();
  });

  await test.step("the footer opens the Estonian page", async () => {
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Estonian", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/languages/estonian/?$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Keep what you learn in Estonian." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/languages/estonian",
    );
  });

  await test.step("an Estonian conversation plays out and explains its words", async () => {
    // The lines drift gently; reduced motion holds them still for a pointer and shows the whole exchange.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("button", { name: /At the café/ }).click();
    const word = page.getByRole("button", { name: "kaneelisai", exact: true });
    await word.click();
    await expect(page.getByRole("tooltip", { name: "cinnamon bun" })).toBeVisible();
    await expect(page.getByText("A coffee and a cinnamon bun, please.")).toHaveCSS("opacity", "1");
  });

  await test.step("the Ukrainian landing page opens the Ukrainian languages page", async () => {
    await page.goto(`${publicSite}/uk/`);
    await page.getByRole("link", { name: "Lymi для вивчення мов", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/uk/languages/?$`));
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(
      page.getByRole("heading", { level: 1, name: "Бережи вивчене будь-якою мовою." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/uk/languages",
    );
  });

  await test.step("the footer's language links switch the page to Russian", async () => {
    await page
      .getByRole("navigation", { name: "Мова" })
      .getByRole("link", { name: "Русский", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/ru/languages/?$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Сохраняй выученное на любом языке." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="uk"]')).toHaveAttribute(
      "href",
      "https://lymi.app/uk/languages",
    );
  });

  await test.step("every edition of both pages is in the sitemap", async () => {
    const sitemap = await (await request.get(`${publicSite}/sitemap.xml`)).text();
    for (const prefix of ["", "/uk", "/ru"]) {
      expect(sitemap).toContain(`<loc>https://lymi.app${prefix}/languages</loc>`);
      expect(sitemap).toContain(`<loc>https://lymi.app${prefix}/languages/estonian</loc>`);
    }
  });
});
