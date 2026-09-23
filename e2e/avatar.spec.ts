import { crc32, deflateSync } from "node:zlib";
import { signInAsTestLearner, startAsTestLearner } from "./auth";
import { expect, type Page, persistedCache, test } from "./test";

/** A solid PNG with a lighter square in it, so a crop has something to move. */
function png(width: number, height: number): Buffer {
  const rows: number[] = [];
  for (let y = 0; y < height; y++) {
    rows.push(0);
    for (let x = 0; x < width; x++) {
      const inside = Math.abs(x - width / 2) < width / 6 && Math.abs(y - height / 2) < height / 6;
      rows.push(...(inside ? [240, 220, 190, 255] : [60, 110, 160, 255]));
    }
  }
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const account = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "Account" }) });
const photo = (page: Page) => account(page).locator("img");
const notifications = (page: Page) => page.getByRole("region", { name: "Notifications" });

async function pick(page: Page, name: string, mimeType: string, buffer: Buffer) {
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer });
}

test("a learner crops, saves and removes their own photo", async ({ page }, testInfo) => {
  await startAsTestLearner(page, testInfo, "avatar", "/settings");
  const face = account(page).getByRole("button", { name: "Change photo" });
  await expect(face).toBeVisible();
  await expect(photo(page)).toHaveCount(0);
  // With nothing of the learner's own to remove, the photo opens the picker, not a menu.
  await expect(face).not.toHaveAttribute("aria-haspopup", "menu");

  // Markup named like a photo never reaches the editor.
  await pick(
    page,
    "photo.png",
    "image/png",
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  );
  await expect(page.getByRole("alert").filter({ hasText: "Couldn’t open that file" })).toHaveText(
    "Couldn’t open that file. Choose a JPEG, PNG or WebP image.",
  );
  await expect(page.getByRole("heading", { name: "Position your photo" })).toHaveCount(0);

  await pick(page, "portrait.png", "image/png", png(600, 400));
  const stage = page.getByRole("application", { name: "Photo position" });
  await expect(stage).toBeVisible();
  await stage.focus();
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByRole("slider", { name: "Zoom" })).toHaveValue("1.25");

  const saved = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().endsWith("/api/avatar"),
  );
  await page.getByRole("button", { name: "Save photo" }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Position your photo" })).toHaveCount(0);
  await expect(photo(page)).toHaveAttribute("src", /^blob:/);

  await page.reload();
  await expect(photo(page)).toHaveAttribute("src", /^blob:/);

  // A failed save keeps the editor open with a way to retry, and the saved photo stays.
  await page.route("**/api/avatar", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 500, body: "{}" })
      : route.fallback(),
  );
  await face.click();
  await page.getByRole("menuitem", { name: "Choose new…" }).click();
  await pick(page, "second.png", "image/png", png(400, 400));
  await page.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByRole("alert")).toHaveText("Couldn’t save the photo. Try again.");
  await expect(page.getByRole("button", { name: "Save photo" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Position your photo" })).toHaveCount(0);
  await expect(photo(page)).toHaveAttribute("src", /^blob:/);
  await page.unroute("**/api/avatar");

  // A change refused as stale refetches the photo once, not on every render.
  let reads = 0;
  await page.route("**/api/avatar", (route) => {
    if (route.request().method() === "GET") reads += 1;
    return route.request().method() === "PUT"
      ? route.fulfill({ status: 409, body: "{}" })
      : route.fallback();
  });
  await face.click();
  await page.getByRole("menuitem", { name: "Choose new…" }).click();
  await pick(page, "stale.png", "image/png", png(400, 400));
  reads = 0;
  await page.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Your photo was changed somewhere else. Check it, then try again.",
  );
  await page.waitForTimeout(1500);
  expect(reads).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.unroute("**/api/avatar");

  // Removal is immediate and can be undone from the toast.
  await face.click();
  await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
  await expect(photo(page)).toHaveCount(0);
  const restored = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().endsWith("/api/avatar"),
  );
  await notifications(page).getByRole("button", { name: "Undo" }).click();
  expect((await restored).status()).toBe(200);
  await expect(photo(page)).toHaveAttribute("src", /^blob:/);

  await face.click();
  await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
  await expect(notifications(page).getByText("Photo removed")).toBeVisible();
  await expect(photo(page)).toHaveCount(0);
  await page.reload();
  await expect(photo(page)).toHaveCount(0);
  await expect(face).not.toHaveAttribute("aria-haspopup", "menu");
});

test("another learner on the same browser never sees the previous photo", async ({
  page,
}, testInfo) => {
  await startAsTestLearner(page, testInfo, "avatar", "/settings");
  const state = await page.evaluate(() => fetch("/api/avatar").then((r) => r.json()));
  const upload = await page.request.put("/api/avatar", {
    data: png(300, 300),
    headers: { "content-type": "image/png", "if-match": `"${state.revision}"` },
  });
  expect(upload.status()).toBe(200);
  await page.reload();
  await expect(photo(page)).toHaveAttribute("src", /^blob:/);

  // The form is the subject here: signing in is what throws the previous learner's persisted
  // cache away, so a restored session would prove nothing.
  await signInAsTestLearner(page, testInfo, "avatar-other");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/avatar/")) requests.push(r.url());
  });
  await page.goto("/settings");
  await expect(account(page).getByRole("button", { name: "Change photo" })).toBeVisible();
  await expect(photo(page)).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await persistedCache(page)).not.toContain('"image"');
});
