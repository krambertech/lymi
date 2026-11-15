export const title = "Report a shared deck or card";
export const start = "/library";

export default async function drive({ page, step, api, expect }) {
  const decks = await api("/api/decks");
  const shared = decks.find((d) => d.name === "Lisboa a dois");
  const own = decks.find((d) => d.name === "Lezione 12");
  const main = page.getByRole("main");
  const report = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("button", { name: "Send report" }) });

  await step("The owner's own deck offers no Report", async () => {
    await page.goto(`/library/${own.id}`);
    await page.getByRole("button", { name: "Deck options" }).click();
    await expect(page.getByRole("menuitem", { name: "Archive" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Report deck" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    return { deck: own.id, role: own.role };
  });

  await step("Report a shared deck with a reason and a note", async () => {
    await page.goto(`/library/${shared.id}`);
    await page.getByRole("button", { name: "Deck options" }).click();
    await page.getByRole("menuitem", { name: "Report deck" }).click();
    await expect(report.getByRole("heading", { name: `Report “${shared.name}”` })).toBeVisible();
    await report.getByRole("button", { name: "Send report" }).click();
    await expect(report.getByText("Choose what’s wrong with it.")).toBeVisible();
    await report.getByRole("radio", { name: "Spam or a scam" }).check();
    await report.getByRole("textbox", { name: "Note" }).fill("Every card links to a shop.");
    await report.getByRole("button", { name: "Send report" }).click();
    await expect(report).toBeHidden();
    await expect(page.getByText("Report sent. We’ll look within a day.")).toBeVisible();
    return { deck: shared.id };
  });

  await step("Report one of its cards from the card's view", async () => {
    const row = main.getByRole("listitem").getByRole("button").first();
    const opened = await row.innerText();
    await row.click();
    // Beside the list on a desktop, a place over it on a phone; either way one Card options.
    await page.getByRole("button", { name: "Card options" }).click();
    await page.getByRole("menuitem", { name: "Report card" }).click();
    await report.getByRole("radio", { name: "Hateful or offensive" }).check();
    await report.getByRole("button", { name: "Send report" }).click();
    await expect(report).toBeHidden();
    return { opened };
  });

  await step("Lymi got an email about the card", async () => {
    const response = await page.request.post("/api/dev/outbox", {
      data: { to: "hello@lymi.app" },
    });
    expect(response.ok()).toBe(true);
    const { message } = await response.json();
    expect(message.subject).toMatch(/^Lymi report: Hateful or offensive · /);
    expect(message.text).toContain("Lisboa a dois");
    expect(message.text).toContain("pnpm moderate show");
    return { subject: message.subject };
  });
}
