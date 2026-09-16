import { launch, makeContext, settle, shot, VIEWPORTS, BASE, SHOTS } from './lib.mjs';
import path from 'node:path';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
const clip = async (label, name) => {
  const box = await page.evaluate((lab) => {
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim().toUpperCase() === lab);
    if (!els.length) return null;
    let n = els[0];
    while (n && n.parentElement) { const r = n.getBoundingClientRect(); if (r.width > 300 && r.height > 180) break; n = n.parentElement; }
    const r = n.getBoundingClientRect();
    return { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 };
  }, label);
  if (!box) { console.log('miss', label); return; }
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), clip: box });
  console.log('saved', name);
};
// State A: cards, no reviews
await page.goto(`${BASE}/api/dev/sign-in?as=fresh&reset=1&returnTo=%2Ftoday`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500);
const d = await (await page.request.post(`${BASE}/api/decks`, { data: { name: 'Lesson 1' } })).json();
const deckId = d.deck?.id || d.id;
for (const [t,m] of [['uno','one'],['due','two'],['tre','three'],['quattro','four'],['cinque','five'],['sei','six'],['sette','seven'],['otto','eight']])
  await page.request.post(`${BASE}/api/cards`, { data: { deckId, term: t, meaning: m } });
await page.goto(`${BASE}/insights`, { waitUntil: 'domcontentloaded' }); await settle(page, 1600);
await clip('CONSISTENCY', 'bug-consistency-zero-of-zero');
await clip('CARDS', 'bug-cards-bar-single-state');
await clip('RECALL', 'bug-recall-empty-plot');
// State B: after one day of reviews
await page.goto(`${BASE}/review`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500);
for (let i = 0; i < 12; i++) { const t = await page.locator('body').innerText(); if (/reviews today/.test(t)) break; await page.keyboard.press('Space'); await page.waitForTimeout(380); await page.keyboard.press('3'); await page.waitForTimeout(520); }
await page.goto(`${BASE}/insights`, { waitUntil: 'domcontentloaded' }); await settle(page, 1600);
await clip('CONSISTENCY', 'bug-consistency-one-day-full-bar');
await clip('RECALL', 'bug-recall-single-dot');
await clip('MONTH BY MONTH', 'bug-month-single-month');
await shot(page, 'bug-lowdata/insights-day1', { fullPage: false });
await browser.close();
