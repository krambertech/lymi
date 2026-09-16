import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';

const persona = process.argv[2] || 'learner';
const vp = process.argv[3] || 'laptop';
const theme = process.argv[4] || 'light';
const grades = (process.argv[5] || '3,3,1,4,2').split(',');
const tag = `review-${persona}-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await signIn(page, persona, '/today');
await settle(page, 1200);
await page.goto(`${BASE}/review`, { waitUntil: 'domcontentloaded' });
await settle(page, 1200);
await shot(page, `${tag}/01-cue`, { fullPage: false });
console.log('--- CUE TEXT ---\n', (await page.locator('body').innerText()).slice(0, 800));

for (let i = 0; i < grades.length; i++) {
  // reveal
  await page.keyboard.press('Space');
  await settle(page, 700);
  if (i === 0) { await shot(page, `${tag}/02-revealed`, { fullPage: false }); console.log('--- REVEALED ---\n', (await page.locator('body').innerText()).slice(0, 900)); }
  await page.keyboard.press(grades[i]);
  await settle(page, 800);
  if (i === 0) await shot(page, `${tag}/03-after-grade`, { fullPage: false });
}
await shot(page, `${tag}/04-mid`, { fullPage: false });
console.log('--- MID ---\n', (await page.locator('body').innerText()).slice(0, 800));
console.log('ERRORS', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)]}));
await browser.close();
