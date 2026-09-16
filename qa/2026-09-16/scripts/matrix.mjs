import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
import fs from 'node:fs';

const combos = JSON.parse(process.argv[2]);
const browser = await launch();
const findings = [];

for (const { persona, vp, theme } of combos) {
  const tag = `${persona}-${vp}-${theme}`;
  const ctx = await makeContext(browser, { viewport: VIEWPORTS[vp], colorScheme: theme, isMobile: vp.startsWith('phone') });
  const page = await ctx.newPage();
  const log = newLog();
  collect(page, log);
  try {
    await signIn(page, persona, '/today');
    await settle(page, 1200);
    let decks = [];
    try { const r = await page.request.get(`${BASE}/api/decks`); const j = await r.json(); decks = (j.decks || j || []).map(d => ({ id: d.id, name: d.name })); } catch {}

    const routes = [['today','/today'],['library','/library'],['insights','/insights'],['activity','/activity'],['archived','/archived'],['settings','/settings'],['import','/import']];
    if (decks[0]) { routes.push(['deck', `/library/${decks[0].id}`]); routes.push(['deck-settings', `/library/${decks[0].id}/settings`]); }

    for (const [name, url] of routes) {
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
      await settle(page, 800);
      await shot(page, `${tag}/${name}`);
      // horizontal overflow check
      const overflow = await page.evaluate(() => {
        const de = document.documentElement;
        const out = [];
        if (de.scrollWidth > de.clientWidth + 1) {
          for (const el of document.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
              out.push(`${el.tagName}.${(el.className && typeof el.className === 'string' ? el.className.slice(0,80) : '')} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
            }
          }
        }
        return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders: out.slice(0, 6) };
      });
      if (overflow.scrollWidth > overflow.clientWidth + 1) findings.push({ tag, name, kind: 'h-overflow', ...overflow });
    }
    if (log.pageerrors.length || log.http.length) findings.push({ tag, kind: 'errors', pageerrors: log.pageerrors, http: [...new Set(log.http)] });
  } catch (e) {
    findings.push({ tag, kind: 'crash', error: String(e).slice(0, 400) });
  }
  await ctx.close();
  console.log('done', tag);
}
fs.writeFileSync('/tmp/claude-0/-home-user-lymi/1f042abe-76f6-5dfb-a66e-93addbbfed97/scratchpad/qa/matrix-findings.json', JSON.stringify(findings, null, 1));
console.log(JSON.stringify(findings, null, 1).slice(0, 6000));
await browser.close();
