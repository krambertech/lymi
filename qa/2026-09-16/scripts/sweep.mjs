import { launch, makeContext, collect, newLog, signIn, shot, settle, VIEWPORTS, BASE } from './lib.mjs';
import fs from 'node:fs';

const persona = process.argv[2] || 'learner';
const vpName = process.argv[3] || 'laptop';
const theme = process.argv[4] || 'light';
const tag = `${persona}-${vpName}-${theme}`;

const browser = await launch();
const ctx = await makeContext(browser, { viewport: VIEWPORTS[vpName], colorScheme: theme, isMobile: vpName.startsWith('phone') });
const page = await ctx.newPage();
const log = newLog();
collect(page, log);

await signIn(page, persona, '/today');
await settle(page, 1200);

// discover deck ids
let decks = [];
try {
  const res = await page.request.get(`${BASE}/api/decks`);
  const json = await res.json();
  decks = (json.decks || json || []).map(d => ({ id: d.id, name: d.name }));
} catch (e) { console.log('deck fetch failed', String(e)); }
console.log('DECKS:', JSON.stringify(decks));

const routes = [
  ['today', '/today'],
  ['library', '/library'],
  ['insights', '/insights'],
  ['activity', '/activity'],
  ['archived', '/archived'],
  ['settings', '/settings'],
  ['import', '/import'],
];
if (decks[0]) {
  routes.push(['deck', `/library/${decks[0].id}`]);
  routes.push(['deck-settings', `/library/${decks[0].id}/settings`]);
}

const report = { persona, vpName, theme, pages: {} };
for (const [name, url] of routes) {
  const before = JSON.stringify(log);
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
  await settle(page, 900);
  const f = await shot(page, `${tag}/${name}`);
  let text = '';
  try { text = await page.locator('body').innerText(); } catch {}
  report.pages[name] = { url: page.url(), textLen: text.length, text: text.slice(0, 1200) };
}
report.log = log;
fs.writeFileSync(`/tmp/claude-0/-home-user-lymi/1f042abe-76f6-5dfb-a66e-93addbbfed97/scratchpad/qa/shots/${tag}/report.json`, JSON.stringify(report, null, 1));
console.log('ERRORS:', JSON.stringify({ console: log.console, pageerrors: log.pageerrors, failed: log.failed, http: log.http }, null, 1).slice(0, 4000));
await browser.close();
