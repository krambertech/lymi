export const title = "Sign in";
export const persona = "learner";
export const start = "/login?returnTo=%2Flibrary";

export default async function drive({ page, base, step, api, expect }) {
  // The preview access cookie must survive signing out of the learner account.
  const signedOut = await page.request.post(`${base}/api/auth/sign-out`, {
    headers: { origin: base },
    data: {},
  });
  expect(signedOut.ok()).toBe(true);
  await page.goto(`${base}/login?returnTo=%2Flibrary`);
  await step("Apple sign-in is available alongside Google and email", async () => {
    await expect(
      page.getByRole("button", { name: "Continue with Apple", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    const session = await api("/api/auth/get-session");
    expect(session).toBeNull();
    return { session };
  });
  await step(
    "An unavailable Apple provider leaves a retry and preserves the destination",
    async () => {
      await page.getByRole("button", { name: "Continue with Apple", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Sign-in didn’t finish. Try again.");
      await expect(
        page.getByRole("button", { name: "Continue with Apple", exact: true }),
      ).toBeEnabled();
      await expect(page).toHaveURL(/returnTo=%2Flibrary/);
      const session = await api("/api/auth/get-session");
      expect(session).toBeNull();
      return { session };
    },
  );
}
