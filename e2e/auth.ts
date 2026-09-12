import { expect, type Page, type TestInfo } from "@playwright/test";
import { type E2EAccount, e2eEmail } from "./settings.mjs";

const password = "lymi-e2e-password";

/** Sign in to this scenario's disposable account, creating it on the first attempt. */
export async function signInAsTestLearner(
  page: Page,
  testInfo: TestInfo,
  account: E2EAccount,
  returnTo = "/today",
) {
  const email = e2eEmail(account, testInfo.project.name, testInfo.retry);

  await page.goto(`/login?${new URLSearchParams({ dev: "1", returnTo })}`);
  await page.getByRole("button", { name: "Dev sign-in", exact: true }).click();
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);

  const response = page.waitForResponse(
    (candidate) =>
      candidate.request().method() === "POST" &&
      candidate.url().endsWith("/api/auth/sign-in/email"),
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  const signIn = await response;
  if (signIn.status() === 401) {
    await page.getByRole("button", { name: "Create account", exact: true }).click();
  } else {
    expect(signIn.ok(), `Sign in failed with HTTP ${signIn.status()}`).toBe(true);
  }

  await expect
    .poll(() => `${new URL(page.url()).pathname}${new URL(page.url()).search}`)
    .toBe(returnTo);
  if (returnTo === "/today") {
    // Today names the state rather than the screen: the heading is the due count on an account
    // with cards, and the first-run line on a fresh one. Match the hero in either state rather
    // than pinning one wording, and keep it specific enough that another screen cannot pass.
    await expect(
      page.getByRole("heading", { level: 1, name: /due|Nothing here yet/ }),
    ).toBeVisible();
  }
}
