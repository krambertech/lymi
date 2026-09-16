import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const persona = process.argv[2] || 'learner';
const vp = process.argv[3] || 'laptop';
const theme = process.argv[4] || 'light';
const tag = `modals-${persona}-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await signIn(page, persona, '/today');
await settle(page, 1200);

const cap = async (n) => { await settle(page, 700); await shot(page, `${tag}/${n}`, { fullPage: false }); };

// streak modal
await page.goto(`${BASE}/today?streak=true`, { waitUntil: 'domcontentloaded' });
await cap('01-streak-modal');
console.log('### streak modal\n', (await page.locator('body').innerText()).slice(0, 1200));

// goal picker inside it
const goalBtn = page.getByRole('button', { name: /goal|change|edit/i }).first();
if (await goalBtn.count()) { await goalBtn.click(); await cap('02-goal-picker'); console.log('### goal picker\n', (await page.locator('body').innerText()).slice(0, 1200)); }

// capture menu
await page.goto(`${BASE}/today`, { waitUntil: 'domcontentloaded' }); await settle(page, 900);
await page.keyboard.press('n'); await cap('03-capture-menu');
console.log('### capture menu\n', (await page.locator('body').innerText()).slice(0, 600));
await page.keyboard.press('Escape'); await settle(page, 400);

// learner menu
const av = page.locator('button').filter({ hasText: /Kateryna|Fresh|Sanna|Marco|Ingrid|Оксана/ }).first();
if (await av.count()) { await av.click(); await cap('04-learner-menu'); console.log('### learner menu\n', (await page.locator('body').innerText()).slice(0, 700)); await page.keyboard.press('Escape'); }

// keyboard shortcuts
await page.keyboard.press('?'); await cap('05-shortcuts');
console.log('### shortcuts\n', (await page.locator('body').innerText()).slice(0, 900));
console.log('ERR', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)].filter(x=>!x.includes('push/config'))}));
await browser.close();
