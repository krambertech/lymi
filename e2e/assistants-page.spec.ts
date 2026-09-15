import { expect, test } from "./test";

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

  await test.step("the footer opens the Russian page, which keeps its headline and connect link", async () => {
    await page
      .getByRole("navigation", { name: "Language" })
      .getByRole("link", { name: "Русский", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/ru/ai-assistants/?$`));
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Создавай карточки с Claude, ChatGPT, Gemini, Codex или своим кодом",
      }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/ru/ai-assistants",
    );
    await page.getByRole("link", { name: "Как подключить", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Скопируй адрес Lymi" })).toBeInViewport();
  });

  await test.step("every edition of the page is in the sitemap", async () => {
    const sitemap = await (await request.get(`${publicSite}/sitemap.xml`)).text();
    for (const prefix of ["", "/uk", "/ru"]) {
      expect(sitemap).toContain(`<loc>https://lymi.app${prefix}/ai-assistants</loc>`);
    }
  });
});
