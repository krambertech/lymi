import { type E2EAccount, e2eEmail } from "./settings.mjs";
import { expect, type Page, type TestInfo } from "./test";

const password = "lymi-e2e-password";

/** Sign in to this scenario's disposable account, creating it on the first attempt. */
export async function signInAsTestLearner(
  page: Page,
  testInfo: TestInfo,
  account: E2EAccount,
  returnTo = "/today",
) {
  const email = e2eEmail(account, testInfo.project.name, testInfo.retry, testInfo.repeatEachIndex);

  await page.goto(`/login?${new URLSearchParams({ dev: "1", returnTo })}`);
  await page.getByRole("button", { name: "Dev sign-in", exact: true }).click();
  // The real door offers the same labels, so every control here comes from the dev panel.
  const panel = page.getByRole("form", { name: "Dev sign-in" });
  await panel.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await panel.getByRole("textbox", { name: "Password", exact: true }).fill(password);

  const signedIn = () =>
    page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        candidate.url().endsWith("/api/auth/sign-in/email"),
    );

  const first = signedIn();
  await panel.getByRole("button", { name: "Sign in", exact: true }).click();
  const signIn = await first;
  if (signIn.status() === 401) {
    // No account yet. Creating one signs in straight after, because a local address is
    // created already confirmed.
    const created = signedIn();
    await panel.getByRole("button", { name: "Create account", exact: true }).click();
    const retry = await created;
    expect(retry.ok(), `Sign in after creating failed with HTTP ${retry.status()}`).toBe(true);
  } else {
    expect(signIn.ok(), `Sign in failed with HTTP ${signIn.status()}`).toBe(true);
  }

  await expect
    .poll(() => `${new URL(page.url()).pathname}${new URL(page.url()).search}`)
    .toBe(returnTo);
  if (returnTo === "/today") {
    // The due card names the state: the count on an account with cards, nothing due, or the
    // first-run line on a fresh one. Match it in any state, specific enough that another screen
    // cannot pass.
    await expect(page.getByRole("heading", { level: 1, name: "Today", exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /due|Getting started|Start with a deck|No cards yet|Nothing due/,
      }),
    ).toBeVisible();
  }
}
