import { launch, makeContext, collect, newLog, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const vp = process.argv[2] || 'laptop', theme = process.argv[3] || 'light';
const tag = `signedout-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
const routes = [['login','/login'],['root','/'],['today-redirect','/today'],['join-bad','/join/doesnotexist'],['add-bad','/add/nope'],['deck-404','/library/nope'],['route-404','/definitely-not-a-route'],['consent','/consent']];
for (const [n,u] of routes) {
  await page.goto(`${BASE}${u}`, { waitUntil: 'domcontentloaded' });
  await settle(page, 1200);
  await shot(page, `${tag}/${n}`, { fullPage: false });
  console.log(`\n### ${n} -> ${page.url()}\n` + (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 400));
}
console.log('\nERR', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)]}, null, 1).slice(0,1500));
await browser.close();
