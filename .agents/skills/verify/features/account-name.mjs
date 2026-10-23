export const title = "Account name";
export const start = "/settings";

const offline = "Olena K.";

export default async function drive({ page, step, api, expect }) {
  const before = await api("/api/me");
  // A persona reset keeps the name, so the target differs from whatever an earlier run left.
  const renamed = before.name === "Olena Kovalenko" ? "Olena Bondar" : "Olena Kovalenko";
  const main = page.getByRole("main");
  const field = main.getByRole("textbox", { name: "Name", exact: true });
  const status = main.getByRole("status").first();
  const desktop = (page.viewportSize()?.width ?? 0) >= 768;

  await step("Open Settings and find the name", async () => {
    await expect(main.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(field).toHaveValue(before.name);
    return before;
  });

  await step("An empty name is refused under the field and not sent", async () => {
    await field.fill("");
    await field.press("Tab");
    await expect(main.getByText("Write your name.", { exact: true })).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    expect((await api("/api/me")).name).toBe(before.name);
    return api("/api/me");
  });

  await step("Escape puts the saved name back", async () => {
    await field.focus();
    await field.press("Escape");
    await expect(field).toHaveValue(before.name);
    await expect(field).not.toHaveAttribute("aria-invalid", "true");
    return api("/api/me");
  });

  await step("Rename and press Enter", async () => {
    await field.fill(renamed);
    await field.press("Enter");
    await expect(status).toHaveText("Saved");
    await expect.poll(async () => (await api("/api/me")).name).toBe(renamed);
    if (desktop) {
      await expect(page.getByRole("button", { name: "Olena", exact: true })).toBeVisible();
    }
    return api("/api/me");
  });

  await step("Offline, the save fails and the typed name stays", async () => {
    await page.route("**/api/me", (route) =>
      route.request().method() === "PATCH" ? route.abort("internetdisconnected") : route.fallback(),
    );
    await field.fill(offline);
    await field.press("Enter");
    await expect(status).toHaveText(
      "Couldn’t save your name. Check your connection and try again.",
    );
    await expect(field).toHaveValue(offline);
    expect((await api("/api/me")).name).toBe(renamed);
    await page.unroute("**/api/me");
    return api("/api/me");
  });

  await step("After a reload the field shows the saved name", async () => {
    // The kept cache is written at most once a second; a reload inside it shows the old name.
    await page.waitForTimeout(1_500);
    await page.reload();
    await expect(field).toHaveValue(renamed);
    return api("/api/me");
  });
}
