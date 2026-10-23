export const title = "The day turns at the end of a review";
export const start = "/today";

export default async function drive({ page, step, api, expect }) {
  const before = await api("/api/stats/streak");

  await step("Today shows the run before the day is met", async () => {
    await expect(page.getByRole("heading", { name: "9 cards due today" })).toBeVisible();
    expect(before.today.outcome).toBe("open");
    return { current: before.current, today: before.today };
  });

  await step("Grade every due card Good to reach the end of the review", async () => {
    await page
      .getByRole("region", { name: "Today" })
      .getByRole("link", { name: /^Review/ })
      .click();
    const reveal = page.getByRole("button", { name: "Reveal the card" });
    await expect(reveal).toBeVisible();
    for (let i = 0; i < 30 && (await reveal.isVisible()); i++) {
      await reveal.click({ position: { x: 24, y: 24 } });
      await page.getByRole("button", { name: /^Good/ }).click();
      await page.waitForTimeout(150);
    }
    await expect(
      page.getByRole("heading", { name: /Daily goal reached|done for today/ }),
    ).toBeVisible();
    return (await api("/api/dev/state")).counts;
  });

  await step("The run reads one more day, and the server agrees", async () => {
    const run = before.current + 1;
    await expect(page.getByText(new RegExp(`^${run}\\s*days in a row$`))).toBeVisible();
    await expect.poll(async () => (await api("/api/stats/streak")).current).toBe(run);
    const after = await api("/api/stats/streak");
    expect(["goal_met", "exhausted"]).toContain(after.today.outcome);
    return { current: after.current, today: after.today };
  });
}
