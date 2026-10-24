export const title = "Account name";
export const start = "/settings";

const offline = "Olena K.";

export default async function drive({ page, step, api, expect }) {
  const before = await api("/api/me");
  // A persona reset keeps the name, so the target differs from whatever an earlier run left.
  const renamed = before.name === "Olena Kovalenko" ? "Olena Bondar" : "Olena Kovalenko";
  const main = page.getByRole("main");
  const edit = main.getByRole("button", { name: "Edit name", exact: true });
  const dialog = page.getByRole("dialog", { name: "Edit name" });
  const field = dialog.getByRole("textbox", { name: "Name", exact: true });
  const save = dialog.getByRole("button", { name: "Save", exact: true });
  const desktop = (page.viewportSize()?.width ?? 0) >= 768;
  const currentName = async () => (await api("/api/me")).name;

  const open = async () => {
    await expect(edit).toBeVisible();
    await edit.click();
    await expect(dialog).toBeVisible();
  };

  await step("Open Settings and find the name", async () => {
    await expect(main.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(main.getByText(before.name, { exact: true })).toBeVisible();
    return before;
  });

  await step("An empty name is refused under the field and not sent", async () => {
    await open();
    await expect(field).toHaveValue(before.name);
    await field.fill("");
    await save.click();
    await expect(dialog.getByText("Write your name.", { exact: true })).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    expect(await currentName()).toBe(before.name);
    return api("/api/me");
  });

  await step("Cancel closes the dialog and keeps the name", async () => {
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(main.getByText(before.name, { exact: true })).toBeVisible();
    return api("/api/me");
  });

  await step("Rename and save", async () => {
    await open();
    await field.fill(renamed);
    await save.click();
    await expect(dialog).toBeHidden();
    await expect(main.getByText(renamed, { exact: true })).toBeVisible();
    await expect.poll(currentName).toBe(renamed);
    if (desktop) {
      await expect(page.getByRole("button", { name: "Olena", exact: true })).toBeVisible();
    }
    return api("/api/me");
  });

  await step("Offline, the save fails and the dialog keeps the typed name", async () => {
    await page.route("**/api/me", (route) =>
      route.request().method() === "PATCH" ? route.abort("internetdisconnected") : route.fallback(),
    );
    await open();
    await field.fill(offline);
    await field.press("Enter");
    await expect(
      dialog.getByText("Couldn’t save your name. Check your connection and try again."),
    ).toBeVisible();
    await expect(field).toHaveValue(offline);
    expect(await currentName()).toBe(renamed);
    await page.unroute("**/api/me");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    return api("/api/me");
  });

  await step("After a reload Settings shows the saved name", async () => {
    // The kept cache is written at most once a second; a reload inside it shows the old name.
    await page.waitForTimeout(1_500);
    await page.reload();
    await expect(main.getByText(renamed, { exact: true })).toBeVisible();
    return api("/api/me");
  });
}
