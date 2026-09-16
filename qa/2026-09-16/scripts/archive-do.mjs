import { launch, makeContext, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
await page.goto(`${BASE}/api/dev/sign-in?as=fresh&reset=1&returnTo=%2Ftoday`, { waitUntil: 'domcontentloaded' });
await settle(page, 1500);
const d = await (await page.request.post(`${BASE}/api/decks`, { data: { name: 'Throwaway' } })).json();
const deckId = d.deck?.id || d.id;
await page.request.post(`${BASE}/api/cards`, { data: { deckId, term: 'ciao', meaning: 'hello' } });
await page.goto(`${BASE}/library/${deckId}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1400);
const menu = page.getByRole('button', { name: /more|menu|options/i }).last();
await menu.click(); await settle(page, 600);
await shot(page, 'archive/1-menu', { fullPage: false });
await page.getByRole('menuitem', { name: /archive/i }).first().click().catch(async () => { await page.getByText(/^Archive$/).first().click(); });
await settle(page, 900);
await shot(page, 'archive/2-confirm', { fullPage: false });
console.log('after clicking Archive:', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 500));
// confirm if a dialog appeared
const conf = page.getByRole('button', { name: /^archive/i }).last();
if (await conf.count()) { await conf.click(); await settle(page, 1500); }
await shot(page, 'archive/3-after', { fullPage: false });
console.log('after confirming:', page.url(), '|', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 400));
await page.goto(`${BASE}/archived`, { waitUntil: 'domcontentloaded' }); await settle(page, 1200);
console.log('archived screen:', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 300));
await browser.close();
