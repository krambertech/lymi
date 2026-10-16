export const title = "Sign in";
export const persona = "learner";
export const start = "/login?returnTo=%2Flibrary";

export default async function drive({ page, step, api, expect }) {
  const before = await api("/api/dev/state");
  await step("Apple sign-in is available alongside Google and email", async () => {
    await expect(
      page.getByRole("button", { name: "Continue with Apple", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    return { userId: before.user.id };
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
      const after = await api("/api/dev/state");
      expect(after.user.id).toBe(before.user.id);
      expect(after.counts).toEqual(before.counts);
      return { userId: after.user.id, counts: after.counts };
    },
  );
}
