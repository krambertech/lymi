import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';

const persona = process.argv[2] || 'learner';
const vp = process.argv[3] || 'phone';
const theme = process.argv[4] || 'light';
const tag = `vp-${persona}-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: true });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await signIn(page, persona, '/today');
await settle(page, 1200);
let decks = [];
try { const r = await page.request.get(`${BASE}/api/decks`); const j = await r.json(); decks = (j.decks||j||[]).map(d=>d.id); } catch {}
const routes = [['today','/today'],['library','/library'],['insights','/insights'],['activity','/activity'],['settings','/settings'],['archived','/archived']];
if (decks[0]) routes.push(['deck', `/library/${decks[0]}`], ['deck-settings', `/library/${decks[0]}/settings`]);
for (const [name, url] of routes) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await settle(page, 900);
  await shot(page, `${tag}/${name}-top`, { fullPage: false });
  const scrolled = await page.evaluate(() => { const before = window.scrollY; window.scrollTo(0, document.body.scrollHeight); return { before, h: document.body.scrollHeight, inner: window.innerHeight }; });
  await page.waitForTimeout(500);
  if (scrolled.h > scrolled.inner + 20) await shot(page, `${tag}/${name}-bottom`, { fullPage: false });
}
console.log('ok', tag);
await browser.close();
