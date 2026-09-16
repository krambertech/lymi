import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await signIn(page, 'learner', '/today'); await settle(page, 1200);
const res = await page.request.get(`${BASE}/api/decks/doesnotexist`);
console.log('API GET /api/decks/doesnotexist ->', res.status(), (await res.text()).slice(0,200));
await page.goto(`${BASE}/library/doesnotexist`, { waitUntil: 'domcontentloaded' });
for (const s of [3, 8, 15]) {
  await page.waitForTimeout(s * 1000 - (s === 3 ? 0 : 0));
  const t = (await page.locator('body').innerText()).replace(/\n+/g,' | ');
  console.log(`after ~${s}s:`, t.slice(0, 300));
}
await shot(page, 'bug-deck-404/stuck-skeleton', { fullPage: false });
console.log('HTTP:', JSON.stringify([...new Set(log.http)]));
await browser.close();
