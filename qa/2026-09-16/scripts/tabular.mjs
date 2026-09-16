import { launch, makeContext, signIn, settle, shot, BASE, VIEWPORTS } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
await signIn(page, 'learner', '/today');
await settle(page, 1200);
const r = await page.evaluate(() => {
  const mk = (fv) => { const s = document.createElement('span'); s.style.cssText = `position:absolute;visibility:hidden;font:inherit;font-variant-numeric:${fv};white-space:pre`; s.textContent = 'Lezione 12'; document.body.appendChild(s); const w = s.getBoundingClientRect().width; s.remove(); return w; };
  return { normal: mk('normal'), tabular: mk('tabular-nums') };
});
console.log('width with normal figures:', r.normal.toFixed(2), '| with tabular-nums:', r.tabular.toFixed(2), '| delta px:', (r.tabular - r.normal).toFixed(2));
// zoom shot of the button
await page.keyboard.press('n'); await settle(page, 900);
const btn = page.getByRole('button', { name: /Add to/i }).first();
await btn.screenshot({ path: '/tmp/claude-0/-home-user-lymi/1f042abe-76f6-5dfb-a66e-93addbbfed97/scratchpad/qa/shots/bug-tabular-button.png' });
await browser.close();
