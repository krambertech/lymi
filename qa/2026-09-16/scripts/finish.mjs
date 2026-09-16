import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';

const persona = process.argv[2] || 'learner';
const vp = process.argv[3] || 'laptop';
const theme = process.argv[4] || 'light';
const grade = process.argv[5] || '3';
const max = Number(process.argv[6] || 60);
const tag = `finish-${persona}-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await signIn(page, persona, '/today');
await settle(page, 1200);
await page.goto(`${BASE}/review`, { waitUntil: 'domcontentloaded' });
await settle(page, 1200);
let i = 0;
for (; i < max; i++) {
  const txt = await page.locator('body').innerText();
  if (/Done|Review another|Review forgotten|Add cards/i.test(txt) && !/Reveal the card/i.test(txt)) break;
  await page.keyboard.press('Space');
  await page.waitForTimeout(450);
  await page.keyboard.press(grade);
  await page.waitForTimeout(600);
}
await settle(page, 1500);
await shot(page, `${tag}/end`, { fullPage: false });
console.log('graded', i);
console.log('--- END TEXT ---\n', (await page.locator('body').innerText()));
// then Today
await page.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' });
await settle(page, 1200);
await shot(page, `${tag}/today-after`, { fullPage: false });
console.log('--- TODAY AFTER ---\n', (await page.locator('body').innerText()).slice(0, 1200));
console.log('ERR', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)].filter(x=>!x.includes('push/config'))}));
await browser.close();
