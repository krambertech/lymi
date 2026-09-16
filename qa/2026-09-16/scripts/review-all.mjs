import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const persona = process.argv[2], vp = process.argv[3], theme = process.argv[4] || 'light';
const n = Number(process.argv[5] || 6);
const tag = `cards-${persona}-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await signIn(page, persona, '/today'); await settle(page, 1200);
await page.goto(`${BASE}/review`, { waitUntil: 'domcontentloaded' }); await settle(page, 1200);
for (let i = 0; i < n; i++) {
  const t = await page.locator('body').innerText();
  if (/reviews today/.test(t)) break;
  await shot(page, `${tag}/${String(i).padStart(2,'0')}-cue`, { fullPage: false });
  await page.keyboard.press('Space'); await settle(page, 700);
  await shot(page, `${tag}/${String(i).padStart(2,'0')}-rev`, { fullPage: false });
  await page.keyboard.press('3'); await settle(page, 700);
}
// check for vertical overflow / clipping
console.log('ok', tag);
await browser.close();
