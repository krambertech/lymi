import { launch, makeContext, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
await signIn(page, 'learner', '/today'); await settle(page, 1500);
const seq = [];
for (let i = 0; i < 14; i++) {
  await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  const info = await page.evaluate(() => {
    const el = document.activeElement; if (!el) return null;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { tag: el.tagName, text: (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0,32),
      outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor, boxShadow: cs.boxShadow.slice(0,50),
      visible: r.width > 0 && r.height > 0, y: Math.round(r.y) };
  });
  seq.push(info);
}
console.log(JSON.stringify(seq, null, 1));
await page.keyboard.press('Tab');
await shot(page, 'a11y/focus-ring', { fullPage: false });
await browser.close();
