import { e2eSiteUrl } from "./ports.mjs";
import { expect, test } from "./test";

const publicSite = e2eSiteUrl;

test("a teacher can reach the teachers page, try the join link and see what is rolling out", async ({
  page,
  request,
}) => {
  await test.step("the languages page's class deck section opens the teachers page", async () => {
    await page.goto(`${publicSite}/languages`);
    await page.getByRole("link", { name: "Lymi for teachers", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`^${publicSite}/teachers/?$`));
    await expect(
      page.getByRole("heading", { level: 1, name: "One deck for your whole class." }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://lymi.app/teachers",
    );
  });

  await test.step("turning the join link off says nobody new can join", async () => {
    await page.getByRole("switch", { name: "Join link" }).click();
    await expect(page.getByText("The link is off. Nobody new can join.")).toBeVisible();
  });

  await test.step("the join section says which features are still rolling out", async () => {
    await expect(
      page.getByText(/Sections and the deck library are rolling out during the beta/),
    ).toBeVisible();
  });

  await test.step("every edition is in the sitemap", async () => {
    const sitemap = await (await request.get(`${publicSite}/sitemap-pages.xml`)).text();
    for (const path of ["/teachers", "/uk/teachers", "/ru/teachers"]) {
      expect(sitemap).toContain(`<loc>https://lymi.app${path}</loc>`);
    }
  });
});
