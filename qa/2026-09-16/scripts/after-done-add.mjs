import { launch, makeContext, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
// clean fresh account
await page.goto(`${BASE}/api/dev/sign-in?as=fresh&reset=1&returnTo=%2Ftoday`, { waitUntil: 'domcontentloaded' });
await settle(page, 1500);
const d = await (await page.request.post(`${BASE}/api/decks`, { data: { name: 'Lesson 1' } })).json();
const deckId = d.deck?.id || d.id;
for (const [term, meaning] of [['uno','one'],['due','two'],['tre','three']])
  await page.request.post(`${BASE}/api/cards`, { data: { deckId, term, meaning } });

// review them all
await page.goto(`${BASE}/review`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500);
for (let i = 0; i < 6; i++) {
  const t = await page.locator('body').innerText();
  if (/reviews today/.test(t)) break;
  await page.keyboard.press('Space'); await page.waitForTimeout(400);
  await page.keyboard.press('3'); await page.waitForTimeout(550);
}
await settle(page, 1200);
await page.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' }); await settle(page, 1200);
await shot(page, 'bug-nothing-left/1-after-finishing', { fullPage: false });
console.log('### after finishing\n', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 500));

// now the learner adds cards from their evening lesson
for (const [term, meaning] of [['quattro','four'],['cinque','five']])
  await page.request.post(`${BASE}/api/cards`, { data: { deckId, term, meaning } });
await page.reload({ waitUntil: 'domcontentloaded' }); await settle(page, 1800);
await shot(page, 'bug-nothing-left/2-after-adding-cards', { fullPage: false });
console.log('### after adding 2 cards\n', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 600));
const q = await (await page.request.get(`${BASE}/api/review/queue?limit=50`)).json();
console.log('queue total now:', q.total);
await browser.close();
