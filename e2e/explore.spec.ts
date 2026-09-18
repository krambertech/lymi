import { expect, test } from "@playwright/test";
import { e2eSiteUrl } from "./ports.mjs";

/** The site reads `e2e/fixtures/published-decks.sql`, which holds two live decks on two shelves. */
const publicSite = e2eSiteUrl;

test("a visitor finds a published deck on Explore, by shelf and by a word on a card", async ({
  page,
  request,
}) => {
  await test.step("the page is public HTML holding every live deck, and nothing private", async () => {
    const response = await request.get(`${publicSite}/explore`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("public, max-age=300");
    expect(response.headers().etag).toMatch(/explore-[a-z0-9]+-en-/);
    expect(response.headers()["set-cookie"]).toBeUndefined();

    const html = await response.text();
    expect(html).toContain('<link rel="canonical" href="https://lymi.app/explore">');
    for (const [lang, path] of [
      ["en", "/explore"],
      ["uk", "/uk/explore"],
      ["ru", "/ru/explore"],
      ["x-default", "/explore"],
    ]) {
      expect(html).toContain(
        `<link rel="alternate" hreflang="${lang}" href="https://lymi.app${path}">`,
      );
    }
    // Complete with JavaScript off: both live decks and both shelves.
    for (const text of ["Evening Estonian", "Estonian road signs", "Languages", "Driving"]) {
      expect(html).toContain(text);
    }
    // Each deck shows one of its own cards. Which one follows the deck's revision, not the reader.
    expect(html).toMatch(/peatee|ülekäigurada/);
    expect(html).toMatch(/tere päevast|üks kohv, palun|head õhtut|head ööd/);
    // A withdrawn deck and an archived one are gone, and no learner reaches the response.
    expect(html).not.toContain("Withdrawn Estonian");
    expect(html).not.toContain("Archived Estonian");
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain("private-publisher@lymi.local");
  });

  await test.step("a repeat visit with the validator is answered 304", async () => {
    const first = await request.get(`${publicSite}/explore`);
    const again = await request.get(`${publicSite}/explore`, {
      headers: { "if-none-match": first.headers().etag ?? "" },
    });
    expect(again.status()).toBe(304);
  });

  await page.goto(`${publicSite}/explore`);
  const decks = page.getByRole("heading", { level: 3 });

  await test.step("both shelves are on the page, each naming what it holds", async () => {
    await expect(page.getByRole("heading", { name: "Languages", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Driving", exact: true })).toBeVisible();
    await expect(decks).toHaveCount(2);
  });

  await test.step("a word from inside a deck narrows the page without loading one", async () => {
    await page.getByRole("searchbox", { name: "Search decks" }).fill("pedestrian");
    await expect(decks).toHaveCount(1);
    await expect(decks.first()).toHaveText("Estonian road signs");
    // Narrowing makes no address of its own, so it makes no page for a crawler to find.
    expect(new URL(page.url()).search).toBe("");
  });

  await test.step("a search with no match says so and offers the way back", async () => {
    await page.getByRole("searchbox", { name: "Search decks" }).fill("zzzz");
    await expect(decks).toHaveCount(0);
    await page.getByRole("button", { name: "Show every deck" }).click();
    await expect(decks).toHaveCount(2);
  });

  await test.step("choosing a shelf narrows the page, and choosing it again undoes that", async () => {
    const driving = page.getByRole("button", { name: /^Driving/ });
    await driving.click();
    await expect(driving).toHaveAttribute("aria-pressed", "true");
    await expect(decks).toHaveCount(1);
    await driving.click();
    await expect(decks).toHaveCount(2);
  });

  await test.step("a deck leads to its own page", async () => {
    await page.getByRole("link", { name: /Evening Estonian/ }).click();
    await expect(page).toHaveURL(`${publicSite}/explore/evening-estonian`);
  });
});

test("the header links to Explore, and the page keeps its shelves at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${publicSite}/explore`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search decks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Languages", exact: true })).toBeVisible();

  // The shelf wraps rather than pushing the page wider than the window.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
