import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  test as base,
  type Page,
} from "@playwright/test";

export * from "@playwright/test";

/** Playwright's test, with the end-of-review blur off in every page: it stalls WebKit without a GPU. docs/testing.md. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await declineAnalytics(context);
    await context.addInitScript(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(":root { --seq-filter: none; }");
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    });
    await use(context);
  },
});

async function declineAnalytics(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: "lymi_analytics_consent",
      value: encodeURIComponent(
        JSON.stringify({ version: 1, allowed: false, updated_at: Date.now() }),
      ),
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
  ]);
}

export async function newTestContext(
  browser: Browser,
  options?: BrowserContextOptions,
): Promise<BrowserContext> {
  const context = await browser.newContext(options);
  await declineAnalytics(context);
  return context;
}

/** The product's persisted query cache, as the JSON `lib/query-persister.ts` keeps in IndexedDB. */
export function persistedCache(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open("lymi", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("cache");
        open.onerror = () => resolve("");
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction("cache", "readonly").objectStore("cache").get("queries");
          get.onsuccess = () => {
            db.close();
            resolve(typeof get.result === "string" ? get.result : "");
          };
          get.onerror = () => {
            db.close();
            resolve("");
          };
        };
      }),
  );
}

/** Drops the persisted query cache; queued before the app opens it, so the next load starts cold. */
export function forgetPersistedCache(): void {
  indexedDB.deleteDatabase("lymi");
}
