import { launch, makeContext, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
await signIn(page, 'learner', '/today'); await settle(page, 1500);
// client-side navigation to an unknown route (what production would render)
await page.evaluate(() => history.pushState({}, '', '/definitely-not-a-route'));
await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
await settle(page, 1500);
await shot(page, 'spa-404/unknown-route', { fullPage: false });
console.log('URL:', page.url());
console.log('TEXT:', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 500));
// also an unknown deck id while signed in
await page.goto(`${BASE}/library/doesnotexist`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500);
await shot(page, 'spa-404/unknown-deck', { fullPage: false });
console.log('\nDECK 404 TEXT:', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 500));
await browser.close();
