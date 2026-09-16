import { launch, makeContext, signIn, settle, VIEWPORTS, BASE, SHOTS } from './lib.mjs';
import path from 'node:path';
const [,, persona, route, label, name, theme='light'] = process.argv;
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop, colorScheme: theme });
const page = await ctx.newPage();
await signIn(page, persona, route); await settle(page, 1200);
await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1500);
const box = await page.evaluate((lab) => {
  const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim().toUpperCase() === lab);
  if (!els.length) return null;
  let n = els[0];
  // walk up to the plate (an element with a background + rounded corners, width > 300)
  while (n && n.parentElement) { const r = n.getBoundingClientRect(); if (r.width > 300 && r.height > 200) break; n = n.parentElement; }
  const r = n.getBoundingClientRect();
  return { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 };
}, label);
if (!box) { console.log('not found'); process.exit(1); }
await page.screenshot({ path: path.join(SHOTS, `${name}.png`), clip: box });
console.log('saved', name, JSON.stringify(box));
await browser.close();
