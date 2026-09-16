import { launch, makeContext, collect, newLog, shot, settle, VIEWPORTS, BASE } from './lib.mjs';

const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await page.goto(`${BASE}/api/dev/sign-in?as=fresh&reset=1&returnTo=%2Ftoday`, { waitUntil: 'domcontentloaded' });
await settle(page, 1200);

// Insights with literally nothing
await page.goto(`${BASE}/insights`, { waitUntil: 'domcontentloaded' }); await settle(page, 1000);
await shot(page, 'newuser/insights-zero', { fullPage: false });
console.log('### insights zero\n', (await page.locator('body').innerText()).slice(0, 800));

// Create a deck + 8 cards via API
const dres = await page.request.post(`${BASE}/api/decks`, { data: { name: 'Italian A1', language: 'it' } });
const deck = await dres.json();
console.log('deck', dres.status(), JSON.stringify(deck).slice(0,200));
const deckId = deck.deck?.id || deck.id;
const words = [['ciao','hello'],['grazie','thank you'],['prego','you are welcome'],['la casa','the house'],['il libro','the book'],['mangiare','to eat'],['bere','to drink'],['domani','tomorrow']];
for (const [term, meaning] of words) {
  const r = await page.request.post(`${BASE}/api/cards`, { data: { deckId, term, meaning, language: 'it' } });
  if (r.status() >= 400) console.log('card fail', r.status(), (await r.text()).slice(0,200));
}
// Insights with cards but no reviews
await page.goto(`${BASE}/insights`, { waitUntil: 'domcontentloaded' }); await settle(page, 1200);
await shot(page, 'newuser/insights-cards-no-reviews', { fullPage: false });
console.log('### insights cards, no reviews\n', (await page.locator('body').innerText()).slice(0, 900));

// Today before first review
await page.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' }); await settle(page, 1000);
await shot(page, 'newuser/today-cards-no-reviews', { fullPage: false });
console.log('### today with cards, no reviews\n', (await page.locator('body').innerText()).slice(0, 900));

// Review all 8
await page.goto(`${BASE}/review`, { waitUntil: 'domcontentloaded' }); await settle(page, 1200);
await shot(page, 'newuser/review-first-card', { fullPage: false });
console.log('### first review card\n', (await page.locator('body').innerText()).slice(0, 400));
for (let i = 0; i < 12; i++) {
  const txt = await page.locator('body').innerText();
  if (/Done$/m.test(txt) && !/Reveal the card/.test(txt)) break;
  await page.keyboard.press('Space'); await page.waitForTimeout(400);
  await page.keyboard.press(i === 2 ? '1' : '3'); await page.waitForTimeout(550);
}
await settle(page, 1500);
await shot(page, 'newuser/review-end', { fullPage: false });
console.log('### review end\n', (await page.locator('body').innerText()).slice(0, 700));

for (const [n, u] of [['today','/today'],['insights','/insights'],['activity','/activity']]) {
  await page.goto(`${BASE}${u}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1200);
  await shot(page, `newuser/after-${n}`, { fullPage: false });
  console.log(`### after ${n}\n`, (await page.locator('body').innerText()).slice(0, 1100));
}
console.log('ERR', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)].filter(x=>!x.includes('push/config'))}));
await browser.close();
