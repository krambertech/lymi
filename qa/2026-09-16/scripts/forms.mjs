import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
const log = newLog(); collect(page, log);
await signIn(page, 'learner', '/today'); await settle(page, 1500);

// 1. shortcuts dialog
await page.keyboard.press('?'); await settle(page, 800);
await shot(page, 'forms/shortcuts', { fullPage: false });
console.log('### shortcuts\n', (await page.locator('body').innerText()).split('\n').slice(-40).join(' | '));
await page.keyboard.press('Escape'); await settle(page, 400);

// 2. add-card form: empty submit
await page.keyboard.press('n'); await settle(page, 800);
const submit = page.getByRole('button', { name: /Add to/i }).first();
console.log('submit disabled with empty term?', await submit.isDisabled());
await submit.click({ force: true }).catch(()=>{});
await settle(page, 700);
await shot(page, 'forms/empty-submit', { fullPage: false });

// 3. duplicate term
await page.getByLabel(/Term/i).first().fill('sbrigare');
await settle(page, 900);
await shot(page, 'forms/duplicate-typed', { fullPage: false });
const before = (await page.locator('body').innerText());
await page.getByRole('button', { name: /Add to/i }).first().click();
await settle(page, 1500);
await shot(page, 'forms/duplicate-submitted', { fullPage: false });
console.log('### after submitting duplicate\n', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 700));

// 4. very long term
await page.keyboard.press('Escape'); await settle(page, 500);
await page.keyboard.press('n'); await settle(page, 800);
await page.getByLabel(/Term/i).first().fill('x'.repeat(400));
await settle(page, 700);
await shot(page, 'forms/very-long-term', { fullPage: false });
console.log('### long term state\n', (await page.locator('body').innerText()).replace(/\n+/g,' | ').slice(0, 500));
console.log('ERR', JSON.stringify({p:log.pageerrors,h:[...new Set(log.http)].filter(x=>!x.includes('push/config'))}));
await browser.close();
