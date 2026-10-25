import { e2eSiteUrl } from "./ports.mjs";
import { expect, test, waitForIslands } from "./test";

const shelves = {
  languages: ["ja", "ko", "zh", "es", "de", "it", "fr", "pt"].map((language, at) => ({
    key: language,
    language,
    path: `/explore/${language}`,
    decks: 9 - at,
    hue: at * 40,
  })),
  subjects: [],
};

test("a closed menu points at no panel, and a click alone loads Explore's shelves", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The top bar's menus are the desktop shape.");
  await page.route("**/explore/shelves.json*", (route) => route.fulfill({ json: shelves }));
  await page.goto(`${e2eSiteUrl}/`);
  await waitForIslands(page);
  const explore = page.getByRole("button", { name: "Explore", exact: true });
  await expect(explore).not.toHaveAttribute("aria-controls");

  // A click with no hover or focus before it, as a screen reader or a script sends one.
  const loaded = page.waitForRequest(/\/explore\/shelves\.json/);
  await explore.dispatchEvent("click");
  await loaded;
  const id = await explore.getAttribute("aria-controls");
  expect(id).toBeTruthy();
  const panel = page.locator(`[id="${id}"]`);
  await expect(panel.getByRole("link", { name: /Japanese/ })).toBeVisible();
});

test("the phone menu keeps its links still while the shelves load", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The full-screen menu is the phone shape.");
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/explore/shelves.json*", async (route) => {
    await held;
    await route.fulfill({ json: shelves });
  });
  await page.goto(`${e2eSiteUrl}/`);
  await waitForIslands(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  const browse = menu.getByRole("link", { name: "Browse all decks" });
  await expect(browse).toBeVisible();
  const before = await browse.boundingBox();

  release();
  await expect(menu.getByRole("link", { name: /Japanese/ })).toBeVisible();
  const after = await browse.boundingBox();
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
});
