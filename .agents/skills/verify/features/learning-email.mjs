export const title = "Learning email";
export const start = "/today";

export default async function drive({ page, step, api, expect }) {
  let link;
  await step("Compose the email the cron would send", async () => {
    const response = await page.request.post("/api/dev/emails/learning", {
      data: { as: "learner", step: "next" },
    });
    expect(response.ok()).toBe(true);
    const email = await response.json();
    expect(email.kind).toMatch(/^learning-(new|due)$/);
    link = email;
    return { kind: email.kind };
  });
  const local = (url) => new URL(url).pathname + new URL(url).search;
  const flip = local(link.learning.url);

  if (link.kind === "learning-due") {
    await step("Grade the card the link opens", async () => {
      await page.goto(flip);
      await page.getByRole("button", { name: "Good" }).click();
      await page.waitForURL(/\/review/);
      return { url: new URL(page.url()).pathname };
    });

    await step("Open the link again: no second grade", async () => {
      await page.goto(flip);
      await expect(page.getByRole("link", { name: "Continue" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Good" })).toHaveCount(0);
      return { graded: true };
    });
  }

  await step("Turn learning emails off from the email's link", async () => {
    await page.goto(local(link.learning.unsubscribeUrl));
    await page.getByRole("button", { name: "Turn off" }).click();
    await expect(page.getByText("Learning emails are off")).toBeVisible();
    const settings = await api("/api/settings");
    expect(settings.learningEmails).toBe(false);
    return settings;
  });

  await step("Turn them back on in Settings", async () => {
    await page.goto("/settings");
    await page.getByRole("switch", { name: "Learning emails" }).click();
    await expect(page.getByText("A few emails when cards are ready")).toBeVisible();
    const settings = await api("/api/settings");
    expect(settings.learningEmails).toBe(true);
    return settings;
  });
}
