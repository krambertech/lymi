export const title = "AI services";
export const start = "/settings";

export default async function drive({ page, step, api, expect }) {
  const group = page.getByRole("main");
  const toggle = page.getByRole("switch", { name: "Use AI services" });

  await step("Settings shows AI on for an account that never answered", async () => {
    await expect(toggle).toBeChecked();
    const settings = await api("/api/settings");
    expect(settings.aiConsent).toBeNull();
    return { aiConsent: settings.aiConsent };
  });

  await step("Turn AI services off", async () => {
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await expect(group).toContainText("Off. Cards stay as you type them");
    await expect.poll(async () => (await api("/api/settings")).aiConsent).toBe(false);
  });

  await step("It stays off after a reload", async () => {
    await page.reload();
    await expect(toggle).not.toBeChecked();
    return { aiConsent: (await api("/api/settings")).aiConsent };
  });

  await step("Turn AI services on again", async () => {
    await toggle.click();
    await expect(toggle).toBeChecked();
    await expect(group).toContainText("Cards go to OpenAI");
    await expect.poll(async () => (await api("/api/settings")).aiConsent).toBe(true);
  });
}
