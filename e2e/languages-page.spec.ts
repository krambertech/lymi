import { e2eSiteUrl } from "./ports.mjs";
import { expect, test, waitForIslands } from "./test";

const publicSite = e2eSiteUrl;

test("a language learner can reach the languages pages and turn notes and cards over", async ({
  page,
  request,
}) => {
  await test.step("the landing page's language use case opens the languages page", async () => {
    await page.goto(publicSite);
    await page.getByRole("link", { name: "Lymi for language learning", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/languages$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Keep what you learn in any language." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/languages",
    );
  });

  await test.step("a photo of the notes turns into cards, skipping the one already kept", async () => {
    await waitForIslands(page);
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
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/languages/estonian$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "The flashcard app that gets Estonian." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/languages/estonian",
    );
  });

  await test.step("picking a word shows its three forms", async () => {
    await waitForIslands(page);
    const word = page.getByRole("button", { name: "minema", exact: true });
    await word.click();
    await expect(word).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("minema · To go", { exact: true })).toBeVisible();
  });

  await test.step("the Ukrainian landing page opens the Ukrainian languages page", async () => {
    await page.goto(`${publicSite}/uk`);
    await page.getByRole("link", { name: "Lymi для вивчення мов", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/uk/languages$`));
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
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/ru/languages$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "Сохраняй выученное на любом языке." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="alternate"][hreflang="uk"]')).toHaveAttribute(
      "href",
      "https://lymi.app/uk/languages",
    );
  });

  await test.step("every edition of both pages is in the sitemap", async () => {
    const pages = await (await request.get(`${publicSite}/sitemap-pages.xml`)).text();
    // The Estonian page renders per request, so the deck sitemap lists it.
    const decks = await (await request.get(`${publicSite}/sitemap-decks.xml`)).text();
    for (const prefix of ["", "/uk", "/ru"]) {
      expect(pages).toContain(`<loc>https://lymi.app${prefix}/languages</loc>`);
      expect(decks).toContain(`<loc>https://lymi.app${prefix}/languages/estonian</loc>`);
    }
  });
});

// #895: an absolutely placed label inside a deck tile that is not its containing block escapes
// the deck row's horizontal scroller and widens the whole page on a phone. The seed has too few
// decks for the row itself to overflow, so the containing block is what is checked.
test("a language page's deck tiles keep their own labels inside them on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(`${publicSite}/languages/estonian`);
  const tiles = page.locator("a.deck-tile");
  await expect(tiles.first()).toBeAttached();
  const escaped = await tiles.evaluateAll((links) =>
    links.flatMap((tile) =>
      [...tile.querySelectorAll<HTMLElement>("*")]
        .filter((element) => getComputedStyle(element).position === "absolute")
        // A hidden element has no offsetParent and takes no space, so it can't widen the page.
        .filter((element) => element.offsetParent !== null)
        .filter((element) => !tile.contains(element.offsetParent))
        .map((element) => `${tile.getAttribute("href")}: ${element.className}`),
    ),
  );
  expect(escaped).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
