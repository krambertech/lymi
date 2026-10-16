import { expect, test } from "./test";

for (const language of [
  { locale: "en-US", button: "Continue with Apple", failure: "Sign-in didn’t finish. Try again." },
  { locale: "uk-UA", button: "Продовжити з Apple", failure: "Вхід не завершено. Спробуй ще раз." },
  { locale: "ru-RU", button: "Продолжить с Apple", failure: "Вход не завершён. Попробуй снова." },
]) {
  test.describe(language.locale, () => {
    test.use({ locale: language.locale });
    test("Apple sign-in reports an unavailable provider and preserves the destination", async ({
      page,
    }) => {
      await page.goto("/login?returnTo=%2Flibrary");
      const apple = page.getByRole("button", { name: language.button, exact: true });
      await expect(apple).toBeVisible();
      await apple.click();
      await expect(page.getByRole("alert")).toContainText(language.failure);
      await expect(apple).toBeEnabled();
      await expect(page).toHaveURL(/returnTo=%2Flibrary/);
    });
  });
}
