import { startAsTestLearner } from "./auth";
import { expect, type Locator, type Page, test } from "./test";

/** Series are optional: decks gather into one, review together, and leave or come back whole. */

async function addDeck(page: Page, name: string, terms: number) {
  const deck = await page.request.post("/api/decks", { data: { name, defaultLanguage: "it" } });
  expect(deck.ok()).toBeTruthy();
  const deckId = ((await deck.json()) as { id: string }).id;
  const cardIds: string[] = [];
  for (let i = 0; i < terms; i++) {
    const card = await page.request.post("/api/cards", {
      data: { deckId, term: `${name} ${i}`, meaning: `meaning ${i}`, language: "it" },
    });
    expect(card.status()).toBe(201);
    cardIds.push(((await card.json()) as { card: { id: string } }).card.id);
  }
  return { deckId, cardIds };
}

function dialog(page: Page, title: string | RegExp): Locator {
  return page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: title }) });
}

/** A series in Library is a region named after it, holding its decks. */
function seriesRegion(page: Page, name: string) {
  return page.locator("main").getByRole("region", { name, exact: true });
}

/** A series' decks in order, leaving out its review banner. */
function deckLinks(region: Locator) {
  return region.getByRole("link", { name: /^(?!.*Review this series)/ });
}

function deckLink(scope: Locator, name: string) {
  return scope.getByRole("link").filter({ has: scope.page().getByText(name, { exact: true }) });
}

async function openLibrary(page: Page) {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  await expect(page.getByText(/^\d+ decks? · \d+ cards?$/).first()).toBeVisible();
}

test("a learner gathers decks into a series and reviews them together", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "series");
  const tag = testInfo.project.name;
  const series = `Italian ${tag}`;
  const verbs = `Verbs ${tag}`;
  const nouns = `Nouns ${tag}`;
  const outside = `Outside ${tag}`;
  await addDeck(page, verbs, 2);
  await addDeck(page, nouns, 1);
  const { cardIds } = await addDeck(page, outside, 3);
  // Today is the getting started guide until a first review, so one card outside the series is graded.
  const graded = await page.request.post("/api/review/grade", {
    data: { cardId: cardIds[0], mode: { cue: "term", target: "meaning" }, rating: 3 },
  });
  expect(graded.ok()).toBeTruthy();

  await test.step("Library looks as it always did before a series exists", async () => {
    await openLibrary(page);
    await expect(page.locator("main").getByRole("region")).toHaveCount(0);
    await expect(deckLink(page.locator("main"), outside)).toBeVisible();
  });

  await test.step("create a series with two decks from Library", async () => {
    await page.getByRole("button", { name: "Library options", exact: true }).click();
    await page.getByRole("menuitem", { name: "New series", exact: true }).click();
    const sheet = dialog(page, "New series");
    await sheet.getByRole("button", { name: "Create series", exact: true }).click();
    await expect(sheet.getByText("Give the series a name.")).toBeVisible();

    await sheet.getByRole("textbox", { name: "Name", exact: true }).fill(series);
    await sheet.getByRole("checkbox", { name: nouns, exact: true }).click();
    await sheet.getByRole("checkbox", { name: verbs, exact: true }).click();
    await sheet.getByRole("button", { name: `Move ${verbs} up`, exact: true }).click();
    await sheet.getByRole("button", { name: "Create series", exact: true }).click();
    await expect(sheet).toBeHidden();

    const region = seriesRegion(page, series);
    await expect(region.getByText("2 decks · 3 cards", { exact: true })).toBeVisible();
    await expect(deckLinks(region).nth(0)).toContainText(verbs);
    await page.reload();
    await expect(deckLinks(region).nth(0)).toContainText(verbs);
    await expect(deckLinks(region).nth(1)).toContainText(nouns);
  });

  await test.step("Today offers the series as one row", async () => {
    await page.goto("/today");
    const decks = page.getByRole("region", { name: "Decks to review", exact: true });
    const row = decks.getByRole("link").filter({ hasText: series });
    await expect(row).toContainText("cards due in 2 decks");
    await expect(decks.getByRole("link").filter({ hasText: verbs })).toHaveCount(0);
    await expect(decks.getByRole("link").filter({ hasText: outside })).toBeVisible();
    await row.click();
    await expect(page).toHaveURL(/\/review\?series=/);
    const card = page.getByLabel(/ card for /);
    await expect(card).toBeVisible();
    await expect(card).not.toHaveAttribute("aria-label", new RegExp(outside));
  });

  await test.step("move the third deck in from its own menu, and undo it", async () => {
    await openLibrary(page);
    await deckLink(page.locator("main"), outside).click();
    await expect(page.getByRole("heading", { name: outside, exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Deck options", exact: true })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Move to series", exact: true }).click();
    const picker = dialog(page, "Move to series");
    await picker.getByRole("button", { name: series, exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(page.getByText(`Moved “${outside}” to ${series}`)).toBeVisible();
    // The subtitle names the series beside the deck's language.
    const subtitle = page
      .locator("header")
      .filter({ has: page.getByRole("heading", { level: 1 }) });
    await expect(subtitle.getByText(series, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(subtitle.getByText(series, { exact: true })).toBeHidden();
  });
});

test("deleting a series asks about its decks and does not come back", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "series-delete");
  const tag = testInfo.project.name;

  const makeSeries = async (name: string, deckNames: string[]) => {
    const deckIds = [];
    for (const deckName of deckNames) deckIds.push((await addDeck(page, deckName, 1)).deckId);
    const created = await page.request.post("/api/series", { data: { name, deckIds } });
    expect(created.status()).toBe(201);
  };

  const remove = async (name: string, choice: RegExp) => {
    await openLibrary(page);
    await page.getByRole("button", { name: `Options for ${name}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Delete series", exact: true }).click();
    const ask = dialog(page, `Delete “${name}”?`);
    await ask.getByRole("radio", { name: choice }).click();
    await ask.getByRole("button", { name: "Delete series", exact: true }).click();
    await expect(ask).toBeHidden();
    await expect(seriesRegion(page, name)).toBeHidden();
  };

  await test.step("keeping the decks leaves them in Library without the series", async () => {
    const name = `Kept ${tag}`;
    const deck = `K1 ${tag}`;
    await makeSeries(name, [deck]);
    await remove(name, /^Keep the deck/);
    await expect(deckLink(page.locator("main"), deck)).toBeVisible();
    // Nothing brings the series back, and no menu offers to.
    await page.reload();
    await expect(seriesRegion(page, name)).toBeHidden();
    await expect(page.getByRole("button", { name: "Library options", exact: true })).toBeVisible();
  });

  await test.step("archiving the decks takes them out of Library and review", async () => {
    const name = `Gone ${tag}`;
    const first = `A1 ${tag}`;
    const second = `A2 ${tag}`;
    await makeSeries(name, [first, second]);
    await remove(name, /^Archive its 2 decks too/);
    await expect(deckLink(page.locator("main"), first)).toHaveCount(0);
    const active = await page.request.get("/api/decks");
    const names = ((await active.json()) as { name: string }[]).map((d) => d.name);
    expect(names).not.toContain(first);
    // The decks are on Archived, each restorable on its own.
    await page.goto("/archived");
    await expect(page.getByRole("button", { name: `Restore ${first}`, exact: true })).toBeVisible();
  });

  await test.step("the next series is asked again rather than inheriting Archive", async () => {
    const next = `Next ${tag}`;
    const kept = `N1 ${tag}`;
    const doomed = `Doomed ${tag}`;
    await makeSeries(next, [kept]);
    await makeSeries(doomed, [`D1 ${tag}`]);
    await openLibrary(page);
    // No navigation after this delete: the dialog stays mounted, which is where the choice stuck.
    await remove(doomed, /^Archive its deck too/);
    await page.getByRole("button", { name: `Options for ${next}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Delete series", exact: true }).click();
    const ask = dialog(page, `Delete “${next}”?`);
    // Deleting is final, so a choice made for the last series must not archive this one's decks.
    await expect(ask.getByRole("radio", { name: /^Keep the deck/ })).toBeChecked();
    await ask.getByRole("button", { name: "Delete series", exact: true }).click();
    await expect(deckLink(page.locator("main"), kept)).toBeVisible();
  });
});

test("a deck can be dragged into a series and along it", async ({ page, isMobile }, testInfo) => {
  test.skip(
    isMobile,
    "A pointer drag; touch uses a long press and the menus cover the same moves.",
  );
  await startAsTestLearner(page, testInfo, "series-drag");
  const tag = testInfo.project.name;
  const series = `Drag ${tag}`;
  const inside = `Inside ${tag}`;
  const loose = `Loose ${tag}`;
  const { deckId: insideId } = await addDeck(page, inside, 1);
  await addDeck(page, loose, 1);
  const created = await page.request.post("/api/series", {
    data: { name: series, deckIds: [insideId] },
  });
  expect(created.status()).toBe(201);

  const drag = async (from: Locator, to: Locator) => {
    const start = await from.boundingBox();
    const end = await to.boundingBox();
    if (!start || !end) throw new Error("A deck to drag is not on screen");
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    // Past the six-pixel threshold first, so the drag starts before it travels.
    await page.mouse.move(start.x + start.width / 2 + 12, start.y + start.height / 2, { steps: 4 });
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
    // One more small move settles what the pointer is over before the drop reads it.
    await page.mouse.move(end.x + end.width / 2 + 2, end.y + end.height / 2, { steps: 2 });
    await page.mouse.up();
  };

  await openLibrary(page);
  const region = seriesRegion(page, series);
  await test.step("a deck dropped on a series deck takes its place", async () => {
    await drag(deckLink(page.locator("main"), loose), deckLink(region, inside));
    await expect(deckLinks(region).nth(0)).toContainText(loose);
    await expect(page).toHaveURL(/\/library$/);
    await page.reload();
    await expect(deckLinks(region).nth(0)).toContainText(loose);
    await expect(region.getByText("2 decks · 2 cards", { exact: true })).toBeVisible();
  });

  await test.step("dragging along the series changes its order", async () => {
    await drag(deckLink(region, loose), deckLink(region, inside));
    await expect(deckLinks(region).nth(0)).toContainText(inside);
    await page.reload();
    await expect(deckLinks(region).nth(0)).toContainText(inside);
  });

  await test.step("with every deck in the series, New deck stays", async () => {
    await expect(
      page.locator("main").getByRole("button", { name: "New deck", exact: true }),
    ).toBeVisible();
  });

  await test.step("the keyboard carries a deck out of its series", async () => {
    await deckLink(region, inside).focus();
    await page.keyboard.press("Space");
    // The live region says the deck was picked up, or where it already is.
    await expect(
      page.getByText(new RegExp(`^(Picked up ${inside}\\.|${inside} is over ${series}\\.)$`)),
    ).toBeAttached();
    // dnd-kit listens for arrows a tick after the pickup, so a press that lands first is retried; Library is the top, so extras stay there.
    await expect(async () => {
      await page.keyboard.press("ArrowUp");
      await expect(page.getByText(`${inside} is over Library.`)).toBeAttached({ timeout: 1_000 });
    }).toPass();
    await page.keyboard.press("Space");
    await expect(deckLink(region, inside)).toHaveCount(0);
    // The drop animation still shows a copy of the deck, so the landing is checked after a reload.
    await page.reload();
    await expect(deckLink(page.locator("main"), inside)).toBeVisible();
    await expect(deckLink(region, inside)).toHaveCount(0);
    await expect(region.getByText("1 deck · 1 card", { exact: true })).toBeVisible();
  });
});
