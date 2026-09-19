import { e2eSiteUrl } from "./ports.mjs";
import { expect, test } from "./test";

const publicSite = e2eSiteUrl;

test("the privacy policy names email delivery in every supported language", async ({ request }) => {
  const pages = [
    {
      path: "/privacy",
      locale: "en",
      disclosure:
        "When Lymi sends an account email, Cloudflare Email Service receives the recipient address, sender, subject and message body.",
    },
    {
      path: "/uk/privacy",
      locale: "uk",
      disclosure:
        "Коли Lymi надсилає лист про обліковий запис, Cloudflare Email Service отримує адресу одержувача, відправника, тему й текст листа.",
    },
    {
      path: "/ru/privacy",
      locale: "ru",
      disclosure:
        "Когда Lymi отправляет письмо об аккаунте, Cloudflare Email Service получает адрес получателя, отправителя, тему и текст письма.",
    },
  ] as const;

  for (const page of pages) {
    const response = await request.get(`${publicSite}${page.path}`);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain(`<html lang="${page.locale}"`);
    expect(html).toContain(page.disclosure);
    expect(html).toContain('rel="alternate" hreflang="en" href="https://lymi.app/privacy"');
    expect(html).toContain('rel="alternate" hreflang="uk" href="https://lymi.app/uk/privacy"');
    expect(html).toContain('rel="alternate" hreflang="ru" href="https://lymi.app/ru/privacy"');
  }
});

test("a localized page's footer links to the matching privacy policy", async ({ request }) => {
  const pages = [
    { path: "/uk/", privacy: "/uk/privacy" },
    { path: "/ru/", privacy: "/ru/privacy" },
  ] as const;

  for (const entry of pages) {
    const html = await (await request.get(`${publicSite}${entry.path}`)).text();
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    expect(footer).toContain(`href="${entry.privacy}"`);
    expect((await request.get(`${publicSite}${entry.privacy}`)).ok()).toBe(true);
  }
});
