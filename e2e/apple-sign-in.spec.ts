import { expect, test } from "./test";

test.use({ locale: "en-US" });

test("Apple sign-in reports an unavailable provider and preserves the destination", async ({
  page,
}) => {
  await page.goto("/login?returnTo=%2Flibrary");
  const apple = page.getByRole("button", { name: "Continue with Apple", exact: true });
  await expect(apple).toBeVisible();
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/sign-in/social", async (route) => {
    await pending;
    await route.continue();
  });
  await apple.click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Google/ })).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText("Sign-in didn’t finish. Try again.");
  await expect(apple).toBeEnabled();
  await expect(page).toHaveURL(/returnTo=%2Flibrary/);
});
