import {
  createAccountThroughDevForm,
  expectNoAccountEmail,
  signInAsTestLearner,
  submitDevSignUp,
} from "./auth";
import { type Browser, expect, type Page, type TestInfo, test } from "./test";

/**
 * A classmate's email that is on no allowlist and is not a local persona, so only the join
 * link can let it create an account. One per project and retry, like the allowlisted accounts.
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
    await signInAsTestLearner(page, testInfo, "join-owner");
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

  await test.step("a signed-out classmate cannot create an account without the link", async () => {
    const uninvited = outsider(testInfo, "uninvited");
    await classmate.goto("/login?dev=1");
    await submitDevSignUp(classmate, uninvited);

    // The refusal is silent by design, so the proof is that nothing was created or sent.
    await expectNoAccountEmail(classmate, uninvited);
    await expect(classmate).toHaveURL(/\/login/);
    expect((await classmate.request.get("/api/me")).status()).toBe(401);
  });

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
    await choice(page, "private").click();
    await page
      .getByRole("group", { name: "Turn off the join link" })
      .getByRole("button", { name: "Turn off link", exact: true })
      .click();
    await expect(page.getByRole("radio", { name: /^Link off/ })).toBeChecked();
    await expect(page.getByText("The one person who joined keeps studying.")).toBeVisible();
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

  await classmate.context().close();
});
