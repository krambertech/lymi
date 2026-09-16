import { launch, makeContext, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
await signIn(page, 'learner', '/insights'); await settle(page, 1600);
for (const p of ['90 days', 'All', '30 days']) {
  await page.getByRole('radio', { name: p }).or(page.getByRole('button', { name: p })).or(page.getByText(p, { exact: true })).first().click();
  await settle(page, 1400);
  await shot(page, `periods/${p.replace(/\s/g,'-')}`, { fullPage: false });
  const t = await page.locator('body').innerText();
  const m = t.match(/RECALL[\s\S]{0,220}/);
  console.log(`--- ${p} ---`, (m?m[0]:'').replace(/\n+/g,' | '));
}
await browser.close();
