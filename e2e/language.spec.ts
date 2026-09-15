import { expect, test } from "@playwright/test";
import { signInAsTestLearner } from "./auth";

test("a learner can switch the app language and keep it after reload", async ({
  page,
}, testInfo) => {
  await signInAsTestLearner(page, testInfo, "language");

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
  const context = await browser.newContext({ baseURL: "http://localhost:4173", locale: "uk-UA" });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.getByRole("heading", { name: "Увійти в Lymi" })).toBeVisible();
  await context.close();
});
