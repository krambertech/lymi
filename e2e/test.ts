import { test as base } from "@playwright/test";

export * from "@playwright/test";

/** Playwright's test, with the end-of-review blur off in every page: it stalls WebKit without a GPU. docs/testing.md. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(":root { --seq-filter: none; }");
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    });
    await use(context);
  },
});
