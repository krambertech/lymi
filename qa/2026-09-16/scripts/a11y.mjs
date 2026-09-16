import { launch, makeContext, signIn, settle, VIEWPORTS, BASE } from './lib.mjs';
const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS.laptop });
const page = await ctx.newPage();
await signIn(page, 'learner', '/today'); await settle(page, 1500);
const decks = await (await page.request.get(`${BASE}/api/decks`)).json();
const deckId = (decks.decks||decks)[0].id;
const routes = [['today','/today'],['library','/library'],['insights','/insights'],['activity','/activity'],['settings','/settings'],['deck',`/library/${deckId}`],['review','/review']];
for (const [n,u] of routes) {
  await page.goto(`${BASE}${u}`, { waitUntil: 'domcontentloaded' }); await settle(page, 1300);
  const res = await page.evaluate(() => {
    const out = { namelessControls: [], imgNoAlt: [], headings: [], smallTargets: [], lowContrast: [], dupIds: [] };
    const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.getAttribute('alt') || '').trim();
    for (const el of document.querySelectorAll('button,a,[role="button"],input,select,textarea')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const lbl = name(el) || (el.labels && el.labels.length ? el.labels[0].innerText : '') || el.getAttribute('aria-labelledby');
      if (!lbl) out.namelessControls.push(el.outerHTML.slice(0, 160));
      if ((r.width < 24 || r.height < 24) && el.tagName !== 'INPUT') out.smallTargets.push(`${el.tagName} "${name(el).slice(0,25)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) out.imgNoAlt.push(img.src.slice(0, 80));
    for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) out.headings.push(`${h.tagName}: ${h.innerText.trim().slice(0,40)}`);
    const seen = new Set(); for (const el of document.querySelectorAll('[id]')) { if (seen.has(el.id)) out.dupIds.push(el.id); seen.add(el.id); }
    return out;
  });
  const brief = { route: n,
    nameless: res.namelessControls.length, namelessSample: res.namelessControls.slice(0,2),
    imgNoAlt: res.imgNoAlt.length,
    headings: res.headings,
    smallTargets: [...new Set(res.smallTargets)].slice(0,6),
    dupIds: [...new Set(res.dupIds)] };
  console.log(JSON.stringify(brief, null, 1));
}
await browser.close();
