export const title = "Welcome";
export const persona = "fresh";
export const start = "/welcome";

/** The query cache `lib/query-persister.ts` keeps in IndexedDB, as JSON. */
function keptCache(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open("lymi", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("cache");
        open.onerror = () => resolve("");
        open.onsuccess = () => {
          const get = open.result.transaction("cache").objectStore("cache").get("queries");
          get.onsuccess = () => resolve(typeof get.result === "string" ? get.result : "");
          get.onerror = () => resolve("");
        };
      }),
  );
}

export default async function drive({ page, step, api, expect }) {
  await step("Welcome asks a new account its questions", async () => {
    await expect(page.getByRole("heading", { name: "Welcome to Lymi" })).toBeVisible();
    const settings = await api("/api/settings");
    expect(settings.onboardedAt).toBeNull();
    // Kept before the skip, so the return to Welcome below can restore this copy.
    await expect.poll(() => keptCache(page)).toContain('"onboardedAt":null');
    return { onboardedAt: settings.onboardedAt };
  });

  await step("Skip for now lands on Today and records the account as set up", async () => {
    await page.getByRole("button", { name: "Skip for now", exact: true }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { level: 1, name: "Today", exact: true })).toBeVisible();
    const settings = await api("/api/settings");
    expect(settings.onboardedAt).toBeTruthy();
    return { onboardedAt: settings.onboardedAt };
  });

  await step("Opening Welcome straight after lands on Today", async () => {
    // At once, while the kept cache can still hold the copy from before the skip.
    await page.goto("/welcome", { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { level: 1, name: "Today", exact: true })).toBeVisible();
  });
}
