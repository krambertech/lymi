export const title = "Deck invitation";
export const start = "/library";

const invited = "anna@example.com";

export default async function drive({ page, step, api, expect }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lezione 12");
  const me = await api("/api/me");
  const main = page.getByRole("main");
  const people = main.getByRole("list", { name: "People" });

  await step("Open Lezione 12's settings", async () => {
    await page.goto(`/library/${deck.id}/settings`);
    await expect(people.getByRole("listitem")).toHaveCount(1);
    return deck;
  });

  await step("Invite an email address", async () => {
    await main.getByRole("button", { name: "Invite", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Email address" }).fill(invited);
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect(dialog).toBeHidden();
    await expect(people.getByRole("listitem").nth(1)).toContainText("Not joined yet");
    const waiting = await api(`/api/decks/${deck.id}/invitations`);
    expect(waiting.map((row) => row.email)).toContain(invited);
    return waiting;
  });

  await step("Read the email Lymi sent", async () => {
    const response = await page.request.post("/api/dev/outbox", { data: { to: invited } });
    expect(response.ok()).toBe(true);
    const { message } = await response.json();
    expect(message.subject).toBe(`${me.name} invited you to study ${deck.name}`);
    expect(message.text).toContain(`${me.name} invited you to study this deck`);
    expect(message.text).toMatch(/\d+ cards?/);
    expect(message.html).toContain("lx-hue");
    expect(message.html).toContain("/brand/email/lockup-light.png");
    // The email is drawn as sent, so the screenshot is what the invited person opens.
    await page.setContent(message.html, { waitUntil: "load" });
    await expect(page.getByText(deck.name, { exact: true }).first()).toBeVisible();
    return { subject: message.subject, language: message.language, text: message.text };
  });
}
