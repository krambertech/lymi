import { launch, makeContext, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
await signIn(page, 'learner', '/library'); await settle(page, 1500);
const decks = await (await page.request.get(`${BASE}/api/decks`)).json();
const deckId = (decks.decks||decks)[0].id;
await page.goto(`${BASE}/library/${deckId}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1400);
// open the deck's ... menu
const menu = page.getByRole('button', { name: /more|menu|options|…|\.\.\./i }).last();
if (await menu.count()) { await menu.click(); await settle(page, 700); await shot(page, 'archive/deck-menu', { fullPage: false }); console.log('DECK MENU:', (await page.locator('body').innerText()).split('\n').slice(-25).join(' | ')); }
else console.log('menu not found');
await browser.close();
