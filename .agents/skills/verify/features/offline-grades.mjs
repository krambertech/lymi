export const title = "Offline grades";
export const start = "/today";

const GRADE = "**/api/review/grade";

const unsent = (page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("lymi-outbox") ?? "[]").filter((g) => g.sentAt === undefined)
        .length,
  );

export default async function drive({ page, step, api, expect }) {
  const heading = (due) => page.getByRole("heading", { name: `${due} cards due today` });
  const attempts = async () => (await api("/api/stats/streak")).today.attempts;

  await step("With grades cut off, grade one card Good", async () => {
    await expect(heading(9)).toBeVisible();
    await page.route(GRADE, (route) => route.abort("internetdisconnected"));
    await page
      .getByRole("region", { name: "Today" })
      .getByRole("link", { name: /^Review/ })
      .click();
    await page
      .getByRole("button", { name: "Reveal the card" })
      .click({ position: { x: 24, y: 24 } });
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect.poll(() => unsent(page)).toBe(1);
    expect(await attempts()).toBe(0);
    return { unsent: await unsent(page), attempts: await attempts() };
  });

  await step("Today still shows what the server has", async () => {
    await page.goto("/today");
    await expect(heading(9)).toBeVisible();
    expect(await attempts()).toBe(0);
    return { unsent: await unsent(page), attempts: await attempts() };
  });

  await step("Once the connection returns, Today follows with no review open", async () => {
    await page.unroute(GRADE);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(heading(8)).toBeVisible();
    await expect.poll(attempts).toBe(1);
    expect(await unsent(page)).toBe(0);
    return { unsent: await unsent(page), attempts: await attempts() };
  });
}
