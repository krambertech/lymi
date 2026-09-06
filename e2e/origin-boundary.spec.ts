import { expect, test } from "@playwright/test";

const publicSite = "http://localhost:4174";

test("the public surface has no install contract while the product keeps its PWA", async ({
  page,
}) => {
  await page.goto(publicSite);
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
  await expect(page.getByRole("heading", { name: "Sign in to Lymi" })).toBeVisible();

  await page.goto("/docs/api");
  await expect(page).toHaveURL(`${publicSite}/docs/api/`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://lymi.app/docs/api",
  );
});

test("each origin exposes only its own route and indexing contract", async ({ page, request }) => {
  const siteRobots = await request.get(`${publicSite}/robots.txt`);
  expect(siteRobots.status()).toBe(200);
  expect(await siteRobots.text()).toContain("Sitemap: https://lymi.app/sitemap.xml");

  const productRobots = await request.get("/robots.txt");
  expect(productRobots.status()).toBe(200);
  expect(await productRobots.text()).toBe("User-agent: *\nDisallow: /\n");

  const productLanding = await request.get("/", { maxRedirects: 0 });
  expect(productLanding.status()).toBe(302);
  expect(productLanding.headers().location).toContain("/login");

  const productUnknown = await request.get("/public-page-that-does-not-exist");
  expect(productUnknown.status()).toBe(404);

  await page.goto(`${publicSite}/docs`);
  await expect(page.getByRole("heading", { name: "Lymi API" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("the public Worker owns beta signup without exposing product APIs", async ({
  page,
  request,
}, testInfo) => {
  const email = `separate-deployments-${testInfo.project.name}@example.com`;
  const first = await request.post(`${publicSite}/api/beta`, {
    data: { email, source: "landing" },
  });
  expect(first.status()).toBe(200);
  expect(await first.json()).toEqual({ alreadyOn: false });

  const duplicate = await request.post(`${publicSite}/api/beta`, {
    data: { email, source: "join" },
  });
  expect(duplicate.status()).toBe(200);
  expect(await duplicate.json()).toEqual({ alreadyOn: true });

  const productApi = await request.get(`${publicSite}/api/decks`);
  expect(productApi.status()).toBe(404);

  const uiEmail = `separate-deployments-ui-${testInfo.project.name}@example.com`;
  await page.goto(`${publicSite}/join/`);
  await page.getByRole("textbox", { name: "Email address" }).fill(uiEmail);
  await page.getByRole("button", { name: "Request invitation" }).click();
  await expect(page.getByRole("status")).toContainText("You’re on the list.");
});

test("clearing an installed product origin recovers from stale browser storage", async ({
  browser,
}) => {
  const staleContext = await browser.newContext({ baseURL: "http://localhost:4173" });
  const page = await staleContext.newPage();
  await page.goto("/login?dev=1");
  await page.evaluate(async () => {
    localStorage.setItem("lymi-stale-shell", "public-landing");
    const cache = await caches.open("lymi-stale-public-shell");
    await cache.put("/index.html", new Response("stale public landing"));
    await Promise.all(
      (await navigator.serviceWorker.getRegistrations()).map((item) => item.unregister()),
    );
    await Promise.all((await caches.keys()).map((name) => caches.delete(name)));
    localStorage.clear();
  });
  // An unregistered worker can keep controlling its current document until that client closes.
  // A fresh context represents clearing all site data and reopening the browser or installed app.
  await staleContext.close();
  const recoveredContext = await browser.newContext({ baseURL: "http://localhost:4173" });
  const recoveredPage = await recoveredContext.newPage();

  await recoveredPage.goto("/");
  await expect(recoveredPage).toHaveURL(/\/login$/);
  await expect(recoveredPage.getByRole("heading", { name: "Sign in to Lymi" })).toBeVisible();
  await expect(recoveredPage.getByText("Keep what you learn")).toHaveCount(0);
  await recoveredContext.close();
});
