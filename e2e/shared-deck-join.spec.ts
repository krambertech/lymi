import { createAccountThroughDevForm, startAsTestLearner } from "./auth";
import { type Browser, expect, type Page, type TestInfo, test } from "./test";

/**
 * A classmate's email: not a local persona, so it has to confirm its address like a real one.
 * One per project and retry, like every other account in the suite.
 */
function outsider(testInfo: TestInfo, who: string) {
  return `e2e-${who}-${testInfo.project.name}-r${testInfo.retry}@example.test`;
}

/** The radio input is visually hidden; a learner presses the card around it. */
function choice(page: Page, value: "private" | "link") {
  return page.locator("label", { has: page.locator(`input[type="radio"][value="${value}"]`) });
}

async function signedOutPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

test("an owner shares a deck and a classmate joins through the link", async ({
  page,
  browser,
}, testInfo) => {
  const deckName = `Estonian class ${testInfo.project.name}`;
  let deckId = "";
  let joinUrl = "";

  await test.step("the owner turns on the join link", async () => {
    await startAsTestLearner(page, testInfo, "join-owner");
    const deck = await page.request.post("/api/decks", {
      data: { name: deckName, defaultLanguage: "et" },
    });
    expect(deck.ok()).toBeTruthy();
    deckId = ((await deck.json()) as { id: string }).id;
    const card = await page.request.post("/api/cards", {
      data: { deckId, term: "tere hommikust", meaning: "good morning" },
    });
    expect(card.ok()).toBeTruthy();

    await page.goto(`/library/${deckId}/settings`);
    // The screen first, then its state: a cold dev server can take longer to paint than the
    // expect timeout, and a missing radio would otherwise read as the wrong sharing state.
    await expect(page.getByRole("heading", { name: "Deck settings" })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Private/ })).toBeChecked();
    await choice(page, "link").click();
    const link = page.getByRole("status", { name: "Join link" });
    await expect(link).toHaveText(/\/join\/[A-Za-z0-9_-]{32}$/);
    joinUrl = (await link.textContent()) ?? "";
  });

  await test.step("the fetched page's metadata names the deck and carries no cards", async () => {
    const response = await page.request.get(joinUrl);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<title>Join ${deckName} on Lymi</title>`);
    expect(html).toContain(`<meta property="og:title" content="Join ${deckName} on Lymi">`);
    const head = html.slice(0, html.indexOf("</title>"));
    const meta = (html.match(/<meta [^>]*>/g) ?? []).join("\n");
    expect(meta).toContain("1 card from");
    expect(`${head}${meta}`).not.toMatch(/tere hommikust|good morning/);
  });

  const classmate = await signedOutPage(browser);

  await test.step("the join link admits the classmate and lands them in the deck", async () => {
    await classmate.goto(`${joinUrl}?dev=1`);
    await expect(classmate.getByRole("heading", { name: deckName, exact: true })).toBeVisible();
    await expect(
      classmate.getByRole("list", { name: "Cards from this deck" }).getByRole("listitem"),
    ).toHaveText(["tere hommikustgood morning"]);
    await expect(classmate.getByRole("button", { name: "Join with Google" })).toBeVisible();

    await classmate.getByRole("button", { name: "Dev sign-in", exact: true }).click();
    await expect(classmate).toHaveURL(/\/login\?dev=1/);
    await createAccountThroughDevForm(classmate, outsider(testInfo, "classmate"));

    await expect(classmate).toHaveURL(new RegExp(`/library/${deckId}$`));
    await expect(classmate.getByRole("heading", { name: deckName, exact: true })).toBeVisible();
    await expect(classmate.getByText("tere hommikust", { exact: true })).toBeVisible();
  });

  await test.step("Library names the owner on the joined deck only", async () => {
    const owner = (await (await page.request.get("/api/me")).json()) as { name: string };
    // The rail links the deck too, so read the card in the page itself.
    await classmate.goto("/library");
    await expect(classmate.getByRole("main").getByRole("link", { name: deckName })).toContainText(
      `Shared by ${owner.name}`,
    );
    await page.goto("/library");
    await expect(page.getByRole("main").getByRole("link", { name: deckName })).not.toContainText(
      "Shared by",
    );
  });

  await test.step("the deck is read-only for the member, in the interface and the API", async () => {
    const owner = (await (await page.request.get("/api/me")).json()) as { name: string };
    await classmate.goto(`/library/${deckId}`);
    await expect(classmate.getByText(`Shared by ${owner.name}`)).toBeVisible();
    await expect(classmate.getByRole("button", { name: "Add card" })).toHaveCount(0);

    await classmate.getByRole("button", { name: "Deck options" }).first().click();
    const menu = classmate.getByRole("menu", { name: "Deck options" });
    await expect(menu.getByRole("menuitem")).toHaveText(["About this deck", "Leave deck"]);
    await classmate.keyboard.press("Escape");

    await classmate.getByText("tere hommikust", { exact: true }).click();
    await expect(classmate.getByRole("button", { name: "Card options" })).toHaveCount(0);
    await expect(classmate.getByRole("button", { name: "Edit card" })).toHaveCount(0);
    await classmate.keyboard.press("Escape");

    await classmate.goto(`/library/${deckId}/settings`);
    await expect(classmate.getByRole("heading", { name: "About this deck" })).toBeVisible();
    await expect(classmate.getByRole("textbox", { name: "Name" })).toHaveCount(0);
    await expect(classmate.getByText("Owns this deck and writes its cards")).toBeVisible();

    // The screen hides them; the routes refuse them, so a stale tab or a script gets the same answer.
    for (const path of [`/api/decks/${deckId}/archive`, `/api/cards`]) {
      expect((await classmate.request.post(path, { data: { deckId, term: "x" } })).status()).toBe(
        403,
      );
    }
    const file = await classmate.request.post("/api/exports", {
      data: { format: "anki", deckId },
    });
    expect(file.status()).toBe(403);
  });

  await test.step("the owner's Activity says the link went on and who joined", async () => {
    await page.goto("/activity");
    await expect(
      page.getByRole("link", { name: new RegExp(`Turned on the join link for ${deckName}`) }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(`joined ${deckName}`) })).toBeVisible();
  });

  await test.step("opening the link again changes nothing", async () => {
    await classmate.goto(joinUrl);
    await expect(classmate.getByText("You are already in this deck.")).toBeVisible();
    await expect(classmate.getByRole("link", { name: "Open deck" })).toBeVisible();
    const again = await classmate.request.post(`/api/join/${joinUrl.split("/").at(-1)}`, {
      headers: { "content-type": "application/json" },
    });
    expect(again.ok()).toBeTruthy();
    const decks = (await (await classmate.request.get("/api/decks")).json()) as {
      id: string;
      role: string;
    }[];
    expect(decks.filter((d) => d.id === deckId)).toEqual([
      expect.objectContaining({ role: "learner" }),
    ]);
  });

  let nextUrl = "";
  await test.step("turning the link off keeps the member and kills the URL", async () => {
    await page.goto(`/library/${deckId}/settings`);
    await expect(page.getByRole("heading", { name: "Deck settings" })).toBeVisible();
    await choice(page, "private").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Turn off link", exact: true })
      .click();
    await expect(page.getByRole("radio", { name: /^Private/ })).toBeChecked();
    // The people who joined are in the list above, so the choice no longer counts them.
    await expect(page.getByRole("list", { name: "People" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByText(joinUrl)).toHaveCount(0);

    expect((await page.request.get(joinUrl)).status()).toBe(410);
    await classmate.goto(joinUrl);
    await expect(
      classmate.getByRole("heading", { name: "This join link is turned off" }),
    ).toBeVisible();
    await expect(classmate.getByRole("link", { name: "Open deck" })).toBeVisible();

    await choice(page, "link").click();
    const link = page.getByRole("status", { name: "Join link" });
    await expect(link).toHaveText(/\/join\/[A-Za-z0-9_-]{32}$/);
    nextUrl = (await link.textContent()) ?? "";
    expect(nextUrl).not.toBe(joinUrl);
  });

  await test.step("the old URL admits nobody new", async () => {
    const stranger = await signedOutPage(browser);
    await stranger.goto(`${joinUrl}?dev=1`);
    await expect(
      stranger.getByRole("heading", { name: "This join link is turned off" }),
    ).toBeVisible();
    await expect(stranger.getByRole("button", { name: "Dev sign-in" })).toHaveCount(0);
    await stranger.context().close();
  });

  await test.step("the member leaves, and the owner's Activity says so", async () => {
    await classmate.goto(`/library/${deckId}`);
    await classmate.getByRole("button", { name: "Deck options" }).first().click();
    await classmate.getByRole("menuitem", { name: "Leave deck" }).click();
    await expect(classmate.getByRole("heading", { name: `Leave ${deckName}?` })).toBeVisible();
    await classmate.getByRole("button", { name: "Leave deck", exact: true }).click();

    await expect(classmate).toHaveURL(/\/library$/);
    await expect(classmate.getByRole("main").getByRole("link", { name: deckName })).toHaveCount(0);
    await expect(classmate.getByText(`Left “${deckName}”`)).toBeVisible();
    expect((await classmate.request.get(`/api/decks/${deckId}`)).status()).toBe(404);

    const member = (await (await classmate.request.get("/api/me")).json()) as { name: string };
    await page.goto("/activity");
    await expect(
      page.getByRole("link", { name: new RegExp(`${member.name} left ${deckName}`) }),
    ).toBeVisible();
  });

  await classmate.context().close();
});
