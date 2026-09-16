import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await page.goto(`${BASE}/api/dev/sign-in?as=learner&reset=1&returnTo=%2Ftoday`, { waitUntil: 'domcontentloaded' });
await settle(page, 2000);

// Simulate a server outage: fail every API call
await page.route('**/api/**', r => r.abort('failed'));
for (const [n,u] of [['today','/today'],['library','/library'],['insights','/insights'],['activity','/activity'],['settings','/settings']]) {
  await page.goto(`${BASE}${u}`, { waitUntil: 'domcontentloaded' });
  await settle(page, 2500);
  await shot(page, `offline/${n}`, { fullPage: false });
  console.log(`### ${n}\n` + (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 400));
}
console.log('pageerrors', JSON.stringify(log.pageerrors).slice(0,600));
await browser.close();
