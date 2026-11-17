import { e2eProductUrl, e2eSiteUrl } from "./ports.mjs";
import { expect, newTestContext, test } from "./test";

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
    expect(html).toContain("<title>Evening Estonian · 5 free flashcards · Lymi</title>");
    expect(html).toContain(
      '<meta name="description" content="5 free Estonian flashcards with meanings in English. For example: tere päevast (good afternoon). Phrases for the end of the day.">',
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
      teaches: "Estonian vocabulary",
    });
    // The fixture's Estonian shelf is too small for a page, so the breadcrumb skips the shelf;
    // structured-data.test.ts covers the crumb a shelf with a page adds.
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
      '<meta property="og:image:alt" content="Evening Estonian on Lymi: Estonian · 5 cards">',
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
    const hero = page.locator("header");
    await expect(hero.getByRole("link", { name: "Add free deck" })).toHaveAttribute("href", addUrl);
    await expect(hero.getByRole("link", { name: "Add free deck" })).toHaveAttribute(
      "data-add",
      "hero",
    );
    // The first screen shows the deck's first cards whole, as a turned card shows them.
    const fan = page.getByRole("list", { name: "Cards from this deck" });
    await expect(fan.getByRole("listitem")).toHaveCount(3);
    await expect(fan).toContainText("tere päevast");
    await expect(fan).toContainText("good afternoon");
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "More than flipping cards" })).toBeVisible();
  });

  await test.step("every card is on the page, a section at a time", async () => {
    const inside = page.getByRole("region", { name: "What’s inside" });
    const sections = inside.locator("details");
    await expect(sections).toHaveCount(2);
    await expect(sections.nth(0)).toContainText("Greetings");
    await expect(sections.nth(0)).toContainText("3 cards");
    await expect(sections.nth(0)).toContainText("Start here");
    await expect(sections.nth(1)).toContainText("In the café");
    await expect(sections.nth(1)).toContainText("2 cards");
    // A short first section starts open; the next waits for a press.
    await expect(inside.getByText("good night", { exact: true })).toBeVisible();
    await expect(inside.getByText("one coffee, please", { exact: true })).toBeHidden();
    await sections.nth(1).locator("summary").click();
    await expect(inside.getByText("one coffee, please", { exact: true })).toBeVisible();
    // A card with no meaning keeps its place and says so.
    await expect(inside.getByRole("term").filter({ hasText: "kohupiim" })).toBeVisible();
    await expect(inside.getByText("No meaning yet")).toBeAttached();
    // A card's picture is public with the deck, addressed by the card rather than an approval.
    const picture = inside.getByRole("img", { name: "A lamp lit in a dark window" });
    await expect(picture).toHaveAttribute(
      "src",
      `${e2eProductUrl}/public/media/card/e2e-card-3/image`,
    );
  });

  await test.step("a visitor turns over each card once, then is asked to keep going in Lymi", async () => {
    const meanings = ["good afternoon", "good evening", "good night", "one coffee, please"];
    // The cards load their script as they come into view, as a visitor scrolls to them.
    await page.locator("#try").scrollIntoViewIfNeeded();
    await expect(page.locator("#try astro-island")).not.toHaveAttribute("ssr", "");
    const stack = page.locator("#try").getByRole("region", { name: "Turn a few cards over" });
    const backs: string[] = [];
    for (let turned = 0; turned < meanings.length; turned++) {
      await stack.getByRole("button", { name: "Turn it over" }).click();
      const shown = await stack.locator(".hand-card[data-place='front'] .hand-back").innerText();
      expect(meanings.some((meaning) => shown.includes(meaning))).toBe(true);
      backs.push(shown);
      await stack.getByRole("button", { name: "Next card" }).click();
    }
    // A turned card shows what review shows: its example and its notes.
    const afternoon = backs.find((back) => back.includes("good afternoon"));
    expect(afternoon).toContain("Tere päevast, kuidas läheb?");
    expect(afternoon).toContain("Said from noon until evening.");
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

    // A withdrawn deck merged into another sends its links there, keeping locale and query,
    // through a target that was itself merged later, and answers 410 once the chain ends at a
    // deck that has gone.
    for (const [old, moved] of [
      ["/explore/moved-estonian", pagePath],
      ["/uk/explore/moved-estonian?utm_source=x", `/uk${pagePath}?utm_source=x`],
      ["/explore/moved-twice-estonian", pagePath],
    ]) {
      const redirect = await request.get(`${publicSite}${old}`, { maxRedirects: 0 });
      expect(redirect.status()).toBe(301);
      expect(redirect.headers().location).toBe(`${publicSite}${moved}`);
    }
    expect(
      (await request.get(`${publicSite}/explore/dead-end-estonian`, { maxRedirects: 0 })).status(),
    ).toBe(410);

    const sitemap = await (await request.get(`${publicSite}/sitemap-decks.xml`)).text();
    expect(sitemap).toContain(`<loc>https://lymi.app/uk${pagePath}</loc>`);
    expect(sitemap).toContain("<loc>https://lymi.app/explore</loc>");
    expect(sitemap).toContain('hreflang="uk" href="https://lymi.app/uk/explore"');
    expect(sitemap).not.toContain("withdrawn-estonian");
    expect(sitemap).not.toContain("archived-estonian");
    expect(sitemap).not.toContain("moved-estonian");
  });
});

test("a deck page shows its tags in the reader's language and leads to decks like it", async ({
  page,
}) => {
  await page.goto(`${publicSite}/uk${pagePath}`);
  const tags = page.getByRole("list", { name: "Теги" });
  await expect(tags.getByRole("listitem")).toHaveText(["Базова лексика", "Подорожі"]);

  // The road signs share a tag; the withdrawn and archived decks carry it too but are gone.
  const related = page.getByRole("region", { name: "Схожі колоди" });
  await expect(related.getByRole("heading", { level: 3 })).toHaveText(["Estonian road signs"]);
  await related.getByRole("link", { name: /Estonian road signs/ }).click();
  await expect(page).toHaveURL(`${publicSite}/uk/explore/estonian-road-signs`);
  await expect(page.getByRole("list", { name: "Теги" }).getByRole("listitem")).toHaveText([
    "Подорожі",
  ]);
});

test("without JavaScript the page still shows the deck and its sections", async ({ browser }) => {
  const context = await newTestContext(browser, { javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${publicSite}${pagePath}`);
  await expect(page.getByRole("heading", { level: 1, name: "Evening Estonian" })).toBeVisible();
  // The hand is dealt by the server, and every card is in the page's own HTML.
  await expect(page.locator("#try .hand-card")).toHaveCount(4);
  await expect(page.locator("#try")).toContainText("tere päevast");
  await expect(
    page.locator("header").getByRole("link", { name: "See all 5 cards" }),
  ).toHaveAttribute("href", "#inside");
  await page.locator("#inside details").nth(1).locator("summary").click();
  await expect(
    page.locator("#inside").getByText("one coffee, please", { exact: true }),
  ).toBeVisible();
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
  const view = page.getByRole("region", { name: "What’s inside" });
  // The second word with a recording is in the café, which opens on a press.
  await view.locator("details").nth(1).locator("summary").click();
  const play = view.getByRole("button", { name: "Play pronunciation" });

  await play.first().click();
  await expect(view.getByRole("button", { name: "Stop pronunciation" })).toBeVisible();
  await play.first().click();
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
