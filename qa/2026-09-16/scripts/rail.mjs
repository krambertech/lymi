import { launch, makeContext, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
// learner currently has nothing due (we finished the review)
await signIn(page, 'learner', '/today');
await settle(page, 1200);
const railNothingDue = await page.locator('nav, aside').first().innerText().catch(()=>'');
await shot(page, 'rail/after-done', { fullPage: false });
console.log('--- rail with nothing due ---\n', railNothingDue);
// make cards due
await page.request.post(`${BASE}/api/dev/due`, { data: { count: 4 } });
await page.reload({ waitUntil: 'domcontentloaded' });
await settle(page, 1500);
console.log('--- rail with 4 due ---\n', await page.locator('nav, aside').first().innerText().catch(()=>''));
await shot(page, 'rail/with-due', { fullPage: false });
await browser.close();
