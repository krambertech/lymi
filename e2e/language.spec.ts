import { startAsTestLearner } from "./auth";
import { e2eProductUrl } from "./ports.mjs";
import { expect, test } from "./test";

test("a learner can switch the app language and keep it after reload", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "language");
  // An account that has never chosen a language has one seeded from the browser by the first
  // screen that loads. Settle it here, so the learner's own change is the only write in flight.
  const seeded = await page.request.patch("/api/settings", { data: { appLanguage: "en" } });
  expect(seeded.ok(), `settling the language first failed with HTTP ${seeded.status()}`).toBe(true);

  const picker = (name: string) => page.getByRole("combobox", { name, exact: true });
  // The interface switches before the server answers; the reload below must not outrun the save.
  const saved = () =>
    page.waitForResponse(
      (r) => r.request().method() === "PATCH" && r.url().endsWith("/api/settings"),
    );
  await page.goto("/settings");
  await picker("Language").click();
  const savedUk = saved();
  await page.getByRole("option", { name: "Українська" }).click();
  await savedUk;
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(picker("Мова")).toHaveText("Українська");

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Початок роботи", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("heading", { name: "Початок роботи", exact: true })).toBeVisible();
  await page.goto("/settings");
  await picker("Мова").click();
  const savedEn = saved();
  await page.getByRole("option", { name: "English" }).click();
  await savedEn;
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(picker("Language")).toHaveText("English");
});

test("sign-in follows the browser language", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: e2eProductUrl, locale: "uk-UA" });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("heading", { name: "Увійти в Lymi" })).toBeVisible();
  await context.close();
});
