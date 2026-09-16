import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';

const vp = process.argv[2] || 'laptop';
const theme = process.argv[3] || 'light';
const tag = `onboard-${vp}-${theme}`;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
const step = async (n) => { await settle(page, 700); await shot(page, `${tag}/${n}`, { fullPage: false }); console.log(`\n### ${n}\n` + (await page.locator('body').innerText()).slice(0, 900)); };

// reset fresh account every run
await page.goto(`${BASE}/api/dev/sign-in?as=fresh&reset=1&returnTo=%2Ftoday`, { waitUntil: 'domcontentloaded' });
await settle(page, 1500);
await step('01-today-empty');

// 1. New deck
await page.getByRole('button', { name: /new deck/i }).first().click();
await step('02-new-deck-sheet');
await page.getByRole('textbox').first().fill('Italian A1');
await step('03-new-deck-filled');
await page.getByRole('button', { name: /^(create|add|save|make|new deck)/i }).last().click();
await step('04-after-deck-created');

console.log('URL after deck', page.url());
console.log('ERR', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)].filter(x=>!x.includes('push/config'))}));
await browser.close();
