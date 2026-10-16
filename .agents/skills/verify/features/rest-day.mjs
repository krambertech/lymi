export const title = "Rest day";
export const persona = "rested";
export const start = "/today";

const restLights = (page) => page.getByRole("img", { name: /^Reviewed on .*rest day/ });

export default async function drive({ page, step, api, expect }) {
  await step("Today opens on the banner and names yesterday as rest", async () => {
    await expect(page.getByText("Yesterday was a rest day")).toBeVisible();
    await expect(restLights(page)).toBeVisible();
    const streak = await api("/api/stats/streak");
    return { restDays: streak.restDays, current: streak.current };
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
      page.getByRole("heading", { name: /Daily goal reached|done for today|Review done/ }),
    ).toBeVisible();
    return (await api("/api/dev/state")).counts;
  });

  await step("The end of the review names yesterday as a rest day", async () => {
    await expect(restLights(page)).toBeVisible();
    const streak = await api("/api/stats/streak");
    expect(streak.restDays.length).toBeGreaterThan(0);
    return { restDays: streak.restDays, current: streak.current };
  });
}
