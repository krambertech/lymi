import { expect, test } from "@playwright/test";

const publicSite = "http://localhost:4174";

test("someone with an AI assistant can reach the assistants page and see how to connect", async ({
  page,
  request,
}) => {
  await test.step("the landing page's assistant section opens the assistants page", async () => {
    await page.goto(publicSite);
    await page.getByRole("link", { name: "Lymi with AI assistants", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/ai-assistants/?$`));
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Make cards with Claude, ChatGPT, Gemini, Codex or anything",
      }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/ai-assistants",
    );
  });

  await test.step("the hero's link leads to the address to connect with", async () => {
    await page.getByRole("link", { name: "How to connect", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Copy Lymi’s address" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Copy the address" })).toBeVisible();
  });

  await test.step("the page is in the sitemap", async () => {
    const sitemap = await (await request.get(`${publicSite}/sitemap.xml`)).text();
    expect(sitemap).toContain("<loc>https://lymi.app/ai-assistants</loc>");
  });
});
