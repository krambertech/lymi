import { expect, test } from "@playwright/test";

/** The site reads `e2e/fixtures/published-decks.sql`; publishing itself is covered by the add spec. */
const publicSite = "http://localhost:4174";
const pagePath = "/decks/evening-estonian";
const addUrl = "http://localhost:4173/add/evening-estonian";

test("anyone can read a published deck's page, walk its sections and try its first cards", async ({
  page,
  request,
}) => {
  await test.step("the page is public HTML with its metadata, every card, and nothing private", async () => {
    const response = await request.get(`${publicSite}${pagePath}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("public, max-age=300");
    expect(response.headers().etag).toContain("deck-evening-estonian-r3-en-");
    expect(response.headers()["set-cookie"]).toBeUndefined();

    const html = await response.text();
    expect(html).toContain(
      "<title>Evening Estonian · Estonian vocabulary, level A1 · Lymi</title>",
    );
    expect(html).toContain(`<link rel="canonical" href="https://lymi.app${pagePath}">`);
    for (const [lang, path] of [
      ["en", pagePath],
      ["uk", `/uk${pagePath}`],
      ["ru", `/ru${pagePath}`],
      ["x-default", pagePath],
    ]) {
      expect(html).toContain(
        `<link rel="alternate" hreflang="${lang}" href="https://lymi.app${path}">`,
      );
    }
    const jsonLd = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    expect(JSON.parse(jsonLd ?? "{}")).toMatchObject({
      "@type": "LearningResource",
      name: "Evening Estonian",
      educationalLevel: { name: "A1" },
      teaches: "Estonian vocabulary",
    });
    // Folded away on the page, but in the HTML for search.
    for (const text of ["head ööd", "good night", "üks kohv, palun", "one coffee, please"]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain("e2e-deck-evening");

    const again = await request.get(`${publicSite}${pagePath}`, {
      headers: { "if-none-match": response.headers().etag ?? "" },
    });
    expect(again.status()).toBe(304);
  });

  await test.step("a visitor sees who made the deck and the way to add it", async () => {
    await page.goto(`${publicSite}${pagePath}`);
    await expect(page.getByRole("heading", { level: 1, name: "Evening Estonian" })).toBeVisible();
    await expect(page.getByText("By Lymi", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Add to Lymi", exact: true }).first(),
    ).toHaveAttribute("href", addUrl);
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  });

  await test.step("the sections read as a path, and each opens to its cards", async () => {
    const path = page.getByRole("region", { name: "One section at a time" });
    const steps = path.getByRole("listitem");
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toContainText("Greetings");
    await expect(steps.nth(0)).toContainText("3 cards");
    await expect(steps.nth(0)).toContainText("You start here");
    await expect(steps.nth(1)).toContainText("In the café");
    await expect(steps.nth(1)).toContainText("Opens after the one before");

    await expect(path.getByText("one coffee, please", { exact: true })).toBeHidden();
    await steps.nth(1).getByText("In the café").click();
    await expect(path.getByText("one coffee, please", { exact: true })).toBeVisible();
  });

  await test.step("a visitor tries the first section's cards and sees what Lymi would do", async () => {
    const trial = page.getByRole("region", { name: "Try the first 3 cards" });
    await trial.scrollIntoViewIfNeeded();
    await expect(trial.getByText("1 of 3", { exact: true })).toBeVisible();
    await expect(trial.getByText("tere päevast", { exact: true })).toBeVisible();

    await trial.getByRole("button", { name: /^Show the meaning/ }).click();
    await expect(trial.getByText("good afternoon", { exact: true })).toBeVisible();
    await trial.getByRole("button", { name: /^Forgot/ }).click();

    await expect(trial.getByText("2 of 3", { exact: true })).toBeVisible();
    await expect(trial.getByText("head õhtut", { exact: true })).toBeVisible();
    await trial.getByRole("button", { name: /^Show the meaning/ }).click();
    await trial.getByRole("button", { name: /^Knew it/ }).click();

    await expect(trial.getByText("3 of 3", { exact: true })).toBeVisible();
    await trial.getByRole("button", { name: /^Show the meaning/ }).click();
    await trial.getByRole("button", { name: /^Knew it/ }).click();

    await expect(trial.getByRole("heading", { name: "You knew 2 of 3." })).toBeVisible();
    await expect(trial).toContainText("the one you forgot would come back a few cards later");
    await expect(trial.getByRole("list", { name: "Cards you forgot" })).toHaveText("tere päevast");
    await expect(trial.getByRole("link", { name: "Add all 4 cards to Lymi" })).toHaveAttribute(
      "href",
      addUrl,
    );
  });

  await test.step("the cards work from the keyboard", async () => {
    const trial = page.getByRole("region", { name: "Try the first 3 cards" });
    await trial.getByRole("button", { name: "Start again" }).click();
    await expect(trial.getByRole("button", { name: /^Show the meaning/ })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(trial.getByText("good afternoon", { exact: true })).toBeVisible();
    await expect(trial.getByRole("button", { name: /^Forgot/ })).toBeFocused();
    await page.keyboard.press("2");
    await expect(trial.getByText("2 of 3", { exact: true })).toBeVisible();
    await expect(trial.getByRole("button", { name: /^Show the meaning/ })).toBeFocused();
  });

  await test.step("the Ukrainian and Russian pages carry their own chrome", async () => {
    await page.goto(`${publicSite}/uk${pagePath}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.getByRole("heading", { name: "Розділ за розділом" })).toBeVisible();
    const ru = await request.get(`${publicSite}/ru${pagePath}`);
    expect(ru.status()).toBe(200);
    expect(ru.headers().etag).toContain("-ru-");
  });

  await test.step("an unknown deck or locale is not found", async () => {
    const unknown = await page.goto(`${publicSite}/decks/never-published`);
    expect(unknown?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "There is no deck at this address." }),
    ).toBeVisible();
    expect((await request.get(`${publicSite}/de${pagePath}`)).status()).toBe(404);
  });

  await test.step("a withdrawn or archived deck is gone from its page and the sitemap", async () => {
    const withdrawn = await page.goto(`${publicSite}/decks/withdrawn-estonian`);
    expect(withdrawn?.status()).toBe(410);
    await expect(
      page.getByRole("heading", { name: "This deck is no longer published." }),
    ).toBeVisible();
    expect((await request.get(`${publicSite}/uk/decks/archived-estonian`)).status()).toBe(410);

    const sitemap = await (await request.get(`${publicSite}/sitemap-decks.xml`)).text();
    expect(sitemap).toContain(`<loc>https://lymi.app/uk${pagePath}</loc>`);
    expect(sitemap).not.toContain("withdrawn-estonian");
    expect(sitemap).not.toContain("archived-estonian");
  });
});

test("without JavaScript the first card still reveals its meaning", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${publicSite}${pagePath}`);
  const trial = page.getByRole("region", { name: "Try the first 3 cards" });
  await expect(trial.getByText("good afternoon", { exact: true })).toBeHidden();
  await trial.getByText("Show the meaning", { exact: true }).click();
  await expect(trial.getByText("good afternoon", { exact: true })).toBeVisible();
  await context.close();
});
