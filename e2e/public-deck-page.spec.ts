import { expect, test } from "@playwright/test";
import { e2eProductUrl, e2eSiteUrl } from "./ports.mjs";

/** The site reads `e2e/fixtures/published-decks.sql`; publishing itself is covered by the add spec. */
const publicSite = e2eSiteUrl;
const pagePath = "/explore/evening-estonian";
const addUrl = `${e2eProductUrl}/add/evening-estonian`;

test("anyone can read a published deck's page, see its sections and cards, and turn a few over", async ({
  page,
  request,
}) => {
  await test.step("the page is public HTML with its metadata, every card, and nothing private", async () => {
    const response = await request.get(`${publicSite}${pagePath}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("public, max-age=300");
    expect(response.headers().etag).toMatch(/deck-evening-estonian-[a-z0-9]+-en-/);
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
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
      (match) => JSON.parse(match[1] ?? "{}"),
    );
    expect(jsonLd[0]).toMatchObject({
      "@type": "LearningResource",
      name: "Evening Estonian",
      educationalLevel: { name: "A1" },
      teaches: "Estonian vocabulary",
    });
    expect(jsonLd[1]).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Explore", item: "https://lymi.app/explore" },
        { position: 2, name: "Evening Estonian", item: `https://lymi.app${pagePath}` },
      ],
    });
    // The deck's own preview, rendered beside the page.
    expect(html).toContain(
      `<meta property="og:image" content="https://lymi.app${pagePath}/share.png">`,
    );
    expect(html).toContain(
      '<meta property="og:image:alt" content="Evening Estonian on Lymi: Estonian · A1 · 5 cards">',
    );
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

  await test.step("the preview image is a PNG with the page's cache rules, and none for an unknown deck", async () => {
    const image = await request.get(`${publicSite}${pagePath}/share.png`);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    expect(image.headers()["cache-control"]).toBe("public, max-age=300");
    expect(image.headers().etag).toMatch(/share-evening-estonian-[a-z0-9]+-en-/);
    const png = await image.body();
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    // Width and height live in the IHDR chunk.
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    const again = await request.get(`${publicSite}${pagePath}/share.png`, {
      headers: { "if-none-match": image.headers().etag ?? "" },
    });
    expect(again.status()).toBe(304);
    expect((await request.get(`${publicSite}/uk${pagePath}/share.png`)).status()).toBe(200);
    expect((await request.get(`${publicSite}/explore/never-published/share.png`)).status()).toBe(
      404,
    );
    expect((await request.get(`${publicSite}/explore/withdrawn-estonian/share.png`)).status()).toBe(
      410,
    );
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

  await test.step("the sections read in order, and every card opens in its own view", async () => {
    const sections = page.getByRole("region", { name: "What’s inside" });
    const rows = sections.getByRole("listitem");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Greetings");
    await expect(rows.nth(0)).toContainText("3 cards");
    await expect(rows.nth(0)).toContainText("Start here");
    await expect(rows.nth(1)).toContainText("In the café");
    await expect(rows.nth(1)).toContainText("2 cards");
    await expect(sections.getByText("one coffee, please", { exact: true })).toBeHidden();

    await sections.getByRole("link", { name: "See all 5 cards" }).click();
    const view = page.getByRole("dialog", { name: "All 5 cards" });
    await expect(view).toBeVisible();
    await expect(page).toHaveURL(/#cards$/);
    await view.getByRole("link", { name: /In the café/ }).click();
    await expect(view.getByText("one coffee, please", { exact: true })).toBeInViewport();
    // A card with no meaning keeps its place and says so.
    await expect(view.getByRole("term").filter({ hasText: "kohupiim" })).toBeVisible();
    await expect(view.getByText("No meaning yet")).toBeAttached();
    // A card's picture is public with the deck, addressed by the card rather than an approval.
    const picture = view.getByRole("img", { name: "A lamp lit in a dark window" });
    await expect(picture).toHaveAttribute(
      "src",
      `${e2eProductUrl}/public/media/card/e2e-card-3/image`,
    );
    await page.keyboard.press("Escape");
    await expect(view).toBeHidden();
    await expect(page).not.toHaveURL(/#cards$/);
    await expect(sections.getByRole("link", { name: "See all 5 cards" })).toBeFocused();
  });

  await test.step("a link to #cards opens the view, and Back closes it", async () => {
    await page.goto(`${publicSite}${pagePath}`);
    await page.goto(`${publicSite}${pagePath}#cards`);
    const view = page.getByRole("dialog", { name: "All 5 cards" });
    await expect(view).toBeVisible();
    await page.goBack();
    await expect(view).toBeHidden();
  });

  await test.step("a visitor turns over each card once, then is asked to keep going in Lymi", async () => {
    const meanings = ["good afternoon", "good evening", "good night", "one coffee, please"];
    const how = page.locator("#how");
    await how.scrollIntoViewIfNeeded();
    const stack = how.getByRole("region", { name: "Turn a few cards over" });
    for (let turned = 0; turned < meanings.length; turned++) {
      await stack.getByRole("button", { name: "Turn it over" }).click();
      const shown = await stack.locator(".hand-card[data-place='front'] .hand-back").innerText();
      expect(meanings.some((meaning) => shown.includes(meaning))).toBe(true);
      await stack.getByRole("button", { name: "Next card" }).click();
    }
    await expect(stack.getByText("Keep going in Lymi", { exact: true })).toBeVisible();
    await expect(stack.getByText("One more card is waiting", { exact: false })).toBeVisible();
    await expect(stack.getByRole("link", { name: "Add to Lymi" })).toHaveAttribute("href", addUrl);
    await stack.getByRole("button", { name: "Try again" }).click();
    await expect(stack.getByRole("button", { name: "Turn it over" })).toBeVisible();
  });

  await test.step("the Ukrainian and Russian pages carry their own chrome", async () => {
    await page.goto(`${publicSite}/uk${pagePath}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.getByRole("heading", { name: "Що всередині" })).toBeVisible();
    const ru = await request.get(`${publicSite}/ru${pagePath}`);
    expect(ru.status()).toBe(200);
    expect(ru.headers().etag).toContain("-ru-");
  });

  await test.step("an unknown deck or locale is not found", async () => {
    const unknown = await page.goto(`${publicSite}/explore/never-published`);
    expect(unknown?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "There is no deck at this address." }),
    ).toBeVisible();
    expect((await request.get(`${publicSite}/de${pagePath}`)).status()).toBe(404);
  });

  await test.step("a withdrawn or archived deck is gone from its page and the sitemap", async () => {
    const withdrawn = await page.goto(`${publicSite}/explore/withdrawn-estonian`);
    expect(withdrawn?.status()).toBe(410);
    await expect(
      page.getByRole("heading", { name: "This deck is no longer published." }),
    ).toBeVisible();
    expect((await request.get(`${publicSite}/uk/explore/archived-estonian`)).status()).toBe(410);

    // The deck used to live at /decks/<slug>, and those links are already shared.
    for (const [old, moved] of [
      ["/decks/evening-estonian", "/explore/evening-estonian"],
      ["/uk/decks/evening-estonian", "/uk/explore/evening-estonian"],
    ]) {
      const redirect = await request.get(`${publicSite}${old}`, { maxRedirects: 0 });
      expect(redirect.status()).toBe(301);
      expect(redirect.headers().location).toBe(`${publicSite}${moved}`);
    }

    const sitemap = await (await request.get(`${publicSite}/sitemap-decks.xml`)).text();
    expect(sitemap).toContain(`<loc>https://lymi.app/uk${pagePath}</loc>`);
    expect(sitemap).toContain("<loc>https://lymi.app/explore</loc>");
    expect(sitemap).toContain('hreflang="uk" href="https://lymi.app/uk/explore"');
    expect(sitemap).not.toContain("withdrawn-estonian");
    expect(sitemap).not.toContain("archived-estonian");
  });
});

test("without JavaScript the page still shows the deck and its sections", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${publicSite}${pagePath}`);
  await expect(page.getByRole("heading", { level: 1, name: "Evening Estonian" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Cards from this deck" })).toContainText(
    "tere päevast",
  );
  // The hand is dealt by the server, so its cards and the way into every card need no script.
  await expect(page.locator("#how .hand-card")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "See all 5 cards" })).toHaveAttribute(
    "href",
    "#cards",
  );
  await expect(page.getByRole("region", { name: "What’s inside" })).toContainText("In the café");
  await context.close();
});

test("the card list stops the previous pronunciation and reports playback failures", async ({
  page,
}) => {
  const events: string[] = [];
  await page.exposeFunction("__recordAudioEvent", (event: string) => events.push(event));
  await page.addInitScript(() => {
    const state = { fail: false };
    (window as unknown as { __mediaTest: typeof state }).__mediaTest = state;
    const record = (event: string) =>
      (window as unknown as { __recordAudioEvent: (event: string) => void }).__recordAudioEvent(
        event,
      );
    class FakeAudio extends EventTarget {
      constructor(readonly src: string) {
        super();
      }

      play() {
        record(`play:${this.src}`);
        return state.fail ? Promise.reject(new Error("Playback failed")) : Promise.resolve();
      }

      pause() {
        record(`pause:${this.src}`);
      }
    }
    Object.defineProperty(window, "Audio", { value: FakeAudio });
  });

  await page.goto(`${publicSite}${pagePath}`);
  await page.getByRole("link", { name: "See all 5 cards" }).click();
  const view = page.getByRole("dialog", { name: "All 5 cards" });
  const play = view.getByRole("button", { name: "Play pronunciation" });

  await play.first().click();
  await expect(view.getByRole("button", { name: "Stop pronunciation" })).toBeVisible();
  await play.click();
  await expect(view.getByRole("button", { name: "Stop pronunciation" })).toBeVisible();
  await expect.poll(() => events.length).toBe(3);
  expect(events).toEqual([
    expect.stringContaining("play:"),
    expect.stringContaining("pause:"),
    expect.stringContaining("play:"),
  ]);

  await view.getByRole("button", { name: "Stop pronunciation" }).click();
  await expect(view.getByRole("button", { name: "Stop pronunciation" })).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as { __mediaTest: { fail: boolean } }).__mediaTest.fail = true;
  });
  await play.first().click();
  await expect(view.getByRole("status")).toHaveText("Pronunciation couldn’t play. Try again.");
});
