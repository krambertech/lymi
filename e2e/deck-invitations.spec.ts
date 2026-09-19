import {
  createAccountThroughDevForm,
  expectNoAccountEmail,
  signInAsTestLearner,
  submitDevSignUp,
} from "./auth";
import { type Browser, expect, type Page, type TestInfo, test } from "./test";

/**
 * A classmate's address that is on no allowlist and is not a local persona, so only the
 * invitation written for it can let it create an account. One per project, retry and repeat.
 */
function outsider(testInfo: TestInfo, who: string) {
  const { name } = testInfo.project;
  return `e2e-${who}-${name}-r${testInfo.retry}-p${testInfo.repeatEachIndex}@example.test`;
}

async function signedOutPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}

/** The message Lymi wrote to this address in the local outbox, and the link inside it. */
async function invitationLink(page: Page, to: string) {
  const response = await page.request.post("/api/dev/outbox", { data: { to } });
  expect(response.ok(), `no invitation was sent to ${to}`).toBeTruthy();
  const { message } = (await response.json()) as { message: { subject: string; text: string } };
  const link = /https?:\/\/\S*\/join\/[A-Za-z0-9_-]{32}/.exec(message.text)?.[0];
  expect(link, "the invitation carried no join link").toBeDefined();
  return { subject: message.subject, url: link as string };
}

test("an owner invites somebody by name and only they can come in", async ({
  page,
  browser,
}, testInfo) => {
  const deckName = `Invitations ${testInfo.project.name}`;
  const invited = outsider(testInfo, "invited");
  const stranger = outsider(testInfo, "stranger");
  let deckId = "";
  let invitationUrl = "";

  await test.step("the owner has a private deck", async () => {
    await signInAsTestLearner(page, testInfo, "invite-owner");
    const deck = await page.request.post("/api/decks", {
      data: { name: deckName, defaultLanguage: "et" },
    });
    expect(deck.ok()).toBeTruthy();
    deckId = ((await deck.json()) as { id: string }).id;
    const card = await page.request.post("/api/cards", {
      data: { deckId, term: "kutsuda", meaning: "to invite" },
    });
    expect(card.ok()).toBeTruthy();

    await page.goto(`/library/${deckId}/settings`);
    // Private, and the owner is the only person in it.
    await expect(page.getByRole("radio", { name: /^Private/ })).toBeChecked();
    await expect(page.getByRole("list", { name: "People" }).getByRole("listitem")).toHaveCount(1);
  });

  await test.step("the dialog refuses an empty and a malformed address", async () => {
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const send = dialog.getByRole("button", { name: "Send invitation" });

    // Never disabled: pressing it says what is missing instead of going dead.
    await expect(send).toBeEnabled();
    await send.click();
    await expect(dialog.getByText("Type the email address you want to invite.")).toBeVisible();

    await dialog.getByRole("textbox", { name: "Email address" }).fill("not-an-email");
    await send.click();
    await expect(dialog.getByText("That does not look like an email address.")).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  await test.step("a real address is invited, and Lymi writes to them", async () => {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Email address" }).fill(invited);
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("list", { name: "People" }).getByRole("listitem").nth(1);
    await expect(row).toContainText(invited);
    await expect(row).toContainText("Not joined yet");

    const owner = ((await (await page.request.get("/api/me")).json()) as { name: string }).name;
    const message = await invitationLink(page, invited);
    expect(message.subject).toBe(`${owner} shared a deck with you`);
    invitationUrl = message.url;
    // The deck's size is named, and no card of it is.
    const sent = await page.request.post("/api/dev/outbox", { data: { to: invited } });
    const body = ((await sent.json()) as { message: { text: string } }).message.text;
    expect(body).toContain("1 card");
    expect(body).not.toContain("kutsuda");
  });

  await test.step("the invitation admits nobody but the address it names", async () => {
    // The owner, signed in as somebody else, cannot spend it.
    const asOwner = await page.request.post(`/api/join/${invitationUrl.split("/").at(-1)}`, {
      headers: { "content-type": "application/json" },
    });
    expect(asOwner.status()).toBe(403);
    expect(await asOwner.text()).toContain(invited);

    // A signed-out stranger holding the link cannot make an account on a different address.
    const wrong = await signedOutPage(browser);
    await wrong.goto(`${invitationUrl}?dev=1`);
    await wrong.getByRole("button", { name: "Dev sign-in", exact: true }).click();
    // The join page navigates to sign-in; the form only exists once that lands.
    await expect(wrong).toHaveURL(/\/login\?dev=1/);
    await submitDevSignUp(wrong, stranger);
    // The refusal is silent by design, so the proof is that nothing was created or sent.
    await expectNoAccountEmail(wrong, stranger);
    expect((await wrong.request.get("/api/me")).status()).toBe(401);
    await wrong.context().close();
  });

  const classmate = await signedOutPage(browser);

  await test.step("the invited address joins and moves out of the waiting list", async () => {
    await classmate.goto(`${invitationUrl}?dev=1`);
    await classmate.getByRole("button", { name: "Dev sign-in", exact: true }).click();
    await expect(classmate).toHaveURL(/\/login\?dev=1/);
    await createAccountThroughDevForm(classmate, invited);

    await expect(classmate).toHaveURL(new RegExp(`/library/${deckId}$`));
    await expect(classmate.getByText("kutsuda", { exact: true })).toBeVisible();

    await page.reload();
    const people = page.getByRole("list", { name: "People" });
    await expect(people.getByRole("listitem")).toHaveCount(2);
    await expect(people.getByRole("listitem").nth(1)).not.toContainText("Not joined yet");
    // Spent: the same link cannot admit anyone again.
    expect((await page.request.get(`/api/decks/${deckId}/invitations`)).ok()).toBeTruthy();
    const waiting = (await (
      await page.request.get(`/api/decks/${deckId}/invitations`)
    ).json()) as unknown[];
    expect(waiting).toEqual([]);
  });

  await test.step("only the owner may see or send invitations", async () => {
    expect((await classmate.request.get(`/api/decks/${deckId}/invitations`)).status()).toBe(403);
    const made = await page.request.post("/api/keys", {
      data: { name: "Invitation script", scope: "write" },
    });
    expect(made.ok()).toBeTruthy();
    const key = ((await made.json()) as { key: string }).key;
    const asKey = await page.request.post(`/api/decks/${deckId}/invitations`, {
      headers: { "x-api-key": key, "content-type": "application/json" },
      data: { email: "script@example.test" },
    });
    expect(asKey.status()).toBe(403);
  });

  await test.step("an invitation can be taken back before it is accepted", async () => {
    const second = outsider(testInfo, "cancelled");
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Email address" }).fill(second);
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(dialog).toBeHidden();

    const cancelled = await invitationLink(page, second);
    await page.getByRole("button", { name: `Options for ${second}` }).click();
    await page.getByRole("menuitem", { name: "Cancel invitation" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText(second);
    await confirm.getByRole("button", { name: "Cancel invitation", exact: true }).click();

    await expect(page.getByText(second)).toHaveCount(0);
    const refused = await signedOutPage(browser);
    await refused.goto(`${cancelled.url}?dev=1`);
    await expect(
      refused.getByRole("heading", { name: "This join link is turned off" }),
    ).toBeVisible();
    await refused.context().close();
  });

  await test.step("removing a member takes them out of the deck", async () => {
    const people = page.getByRole("list", { name: "People" });
    const name = ((await (await classmate.request.get("/api/me")).json()) as { name: string }).name;
    await page.getByRole("button", { name: `Options for ${name}` }).click();
    await page.getByRole("menuitem", { name: "Remove from deck" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("there is no way to add them again yet");
    await confirm.getByRole("button", { name: "Remove member", exact: true }).click();

    await expect(people.getByRole("listitem")).toHaveCount(1);
    await classmate.goto("/library");
    await expect(classmate.getByRole("main").getByRole("link", { name: deckName })).toHaveCount(0);
  });

  await classmate.context().close();
});
