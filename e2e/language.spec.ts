import { expect, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

test("a learner can switch the app language and keep it after reload", async ({
  page,
}, testInfo) => {
  await signInAsTestLearner(page, testInfo, "language");

  await page.goto("/you");
  await page.getByRole("combobox", { name: "App language" }).selectOption("uk");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("combobox", { name: "Мова застосунку" })).toHaveValue("uk");

  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Тут поки нічого" })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await page.goto("/you");
  await page.getByRole("combobox", { name: "Мова застосунку" }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("combobox", { name: "App language" })).toHaveValue("en");
});

test("sign-in follows the browser language", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://localhost:4173", locale: "uk-UA" });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("heading", { name: "Увійти в Lymi" })).toBeVisible();
  await context.close();
});
