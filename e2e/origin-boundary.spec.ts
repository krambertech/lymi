import { expect, test } from "@playwright/test";

test("the public surface has no install contract while the product keeps its PWA", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-lymi-surface", "public");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open app", exact: true }).first()).toHaveAttribute(
    "href",
    "http://localhost:4173/",
  );

  await page.goto("/login?dev=1");
  await expect(page.locator("html")).toHaveAttribute("data-lymi-surface", "product");
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

  await page.goto("/docs/api");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:4173/docs/api",
  );
});
