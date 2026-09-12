import { expect, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

test("a learner can switch the app language and keep it after reload", async ({
  page,
}, testInfo) => {
  await signInAsTestLearner(page, testInfo, "language");

  // Settings has one picker, the language, so its accessible name can change under it.
  const picker = () => page.getByRole("combobox").first();
  // The interface switches before the server answers; the reload below must not outrun the save.
  const saved = () =>
    page.waitForResponse(
      (r) => r.request().method() === "PATCH" && r.url().endsWith("/api/settings"),
    );
  await page.goto("/settings");
  await picker().click();
  const savedUk = saved();
  await page.getByRole("option", { name: "Українська" }).click();
  await savedUk;
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(picker()).toHaveText("Українська");

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Тут поки нічого" })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("heading", { name: "Тут поки нічого" })).toBeVisible();
  await page.goto("/settings");
  await picker().click();
  const savedEn = saved();
  await page.getByRole("option", { name: "English" }).click();
  await savedEn;
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(picker()).toHaveText("English");
});

test("sign-in follows the browser language", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://localhost:4173", locale: "uk-UA" });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("heading", { name: "Увійти в Lymi" })).toBeVisible();
  await context.close();
});
