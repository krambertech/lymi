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
    await expect(group).toContainText(
      "Off for mobile and web. Existing card text and saved audio stay.",
    );
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
    await expect(group).toContainText("On for mobile and web.");
    await expect.poll(async () => (await api("/api/settings")).aiConsent).toBe(true);
  });

  for (const locale of [
    {
      code: "en",
      label: "English",
      picker: "Language",
      link: "See what’s shared and with whom in our privacy policy.",
    },
    {
      code: "uk",
      label: "Українська",
      picker: "Language",
      link: "Що й кому надсилається — у нашій політиці конфіденційності.",
    },
    {
      code: "ru",
      label: "Русский",
      picker: "Мова",
      link: "Что и кому отправляется — в нашей политике конфиденциальности.",
    },
  ]) {
    await step(`Read AI services and its privacy link in ${locale.code}`, async () => {
      if (locale.code !== "en") {
        await page.getByRole("combobox", { name: locale.picker, exact: true }).click();
        await page.getByRole("option", { name: locale.label, exact: true }).click();
        await expect.poll(async () => (await api("/api/settings")).appLanguage).toBe(locale.code);
      }
      const policy = page.getByRole("link", { name: locale.link, exact: true });
      await expect(policy).toBeVisible();
      const path = locale.code === "en" ? "/privacy" : `/${locale.code}/privacy`;
      expect(new URL(await policy.getAttribute("href")).pathname).toBe(path);
      await policy.scrollIntoViewIfNeeded();
      return { appLanguage: locale.code, privacyPath: path };
    });
  }
}
