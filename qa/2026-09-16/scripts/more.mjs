import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const vp = process.argv[2] || 'laptop', theme = process.argv[3] || 'light';
const tag = `more-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await page.goto(`${BASE}/api/dev/sign-in?as=learner&reset=1&returnTo=%2Ftoday`, { waitUntil: 'domcontentloaded' });
await settle(page, 2000);
const decks = (await (await page.request.get(`${BASE}/api/decks`)).json());
const list = decks.decks || decks;
const deckId = list[0].id;
const cards = await (await page.request.get(`${BASE}/api/decks/${deckId}/cards`)).json();
const cardId = (cards.cards || cards)[0].id;
console.log('deck', deckId, 'card', cardId);

const go = async (n, u) => { await page.goto(`${BASE}${u}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1300); await shot(page, `${tag}/${n}`, { fullPage: false }); console.log(`\n### ${n}\n` + (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 700)); };
await go('deck-settings', `/library/${deckId}/settings`);
await go('archived', '/archived');
await go('import', '/import');
await go('import-anki', '/import/anki');
// card page: click the first card row
await page.goto(`${BASE}/library/${deckId}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1400);
const row = page.locator('a,button').filter({ hasText: /il sopralluogo|sbrigare|la commissione/ }).first();
if (await row.count()) { await row.click(); await settle(page, 1400); await shot(page, `${tag}/card-page`, { fullPage: false }); console.log('\n### card page ->', page.url(), '\n' + (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 700)); }
else console.log('card row not found');
console.log('\nERR', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)].filter(x=>!x.includes('push/config'))}));
await browser.close();
