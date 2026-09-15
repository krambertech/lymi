import { expect, test } from "@playwright/test";

/** The site reads `e2e/fixtures/published-decks.sql`; publishing itself is covered by the add spec. */
const publicSite = "http://localhost:4174";
const pagePath = "/decks/evening-estonian";

const sections = [
  {
    name: "Greetings",
    cards: [
      ["tere päevast", "good afternoon"],
      ["head õhtut", "good evening"],
      ["head ööd", "good night"],
    ],
  },
  { name: "In the café", cards: [["üks kohv, palun", "one coffee, please"]] },
] as const;

test("anyone can read a published deck's public page, try its first cards and find the way to add it", async ({
  page,
  request,
}) => {
  await test.step("the page is public HTML with its metadata, and nothing private", async () => {
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
    expect(html).not.toContain("PRIVATE");
    expect(html).not.toContain("e2e-deck-evening");

    const again = await request.get(`${publicSite}${pagePath}`, {
      headers: { "if-none-match": response.headers().etag ?? "" },
    });
    expect(again.status()).toBe(304);
  });

  await test.step("a visitor sees every card in order and the way to add the deck", async () => {
    await page.goto(`${publicSite}${pagePath}`);
    await expect(page.getByRole("heading", { level: 1, name: "Evening Estonian" })).toBeVisible();
    const list = page.getByRole("region", { name: "Every card in the deck" });
    const headings = list.getByRole("heading", { level: 3 });
    await expect(headings).toHaveText([/Greetings$/, /In the café$/]);
    for (const section of sections) {
      for (const [term, meaning] of section.cards) {
        await expect(list.getByText(term, { exact: true })).toBeVisible();
        await expect(list.getByText(meaning, { exact: true })).toBeVisible();
      }
    }
    await expect(
      page.getByRole("link", { name: "Add to Lymi", exact: true }).first(),
    ).toHaveAttribute("href", "http://localhost:4173/add/evening-estonian");
  });

  await test.step("a visitor tries the first section's cards without saving anything", async () => {
    const trial = page.getByRole("region", { name: "Try the first 3 cards" });
    await expect(trial.getByText("1 of 3", { exact: true })).toBeVisible();
    await expect(trial.getByText("tere päevast", { exact: true })).toBeVisible();
    await trial.getByText("Show the meaning", { exact: true }).click();
    await expect(trial.getByText("good afternoon", { exact: true })).toBeVisible();
    await trial.getByRole("button", { name: "Next card" }).click();
    await expect(trial.getByText("2 of 3", { exact: true })).toBeVisible();
    await trial.getByText("Show the meaning", { exact: true }).click();
    await trial.getByRole("button", { name: "Next card" }).click();
    await trial.getByText("Show the meaning", { exact: true }).click();
    await trial.getByRole("button", { name: "Done" }).click();
    await expect(trial.getByRole("heading", { name: "That was the first 3 cards." })).toBeVisible();
    await expect(trial.getByRole("link", { name: "Add to Lymi" })).toHaveAttribute(
      "href",
      "http://localhost:4173/add/evening-estonian",
    );
  });

  await test.step("the Ukrainian and Russian pages carry their own chrome", async () => {
    await page.goto(`${publicSite}/uk${pagePath}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.getByRole("heading", { name: "Усі картки колоди" })).toBeVisible();
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
