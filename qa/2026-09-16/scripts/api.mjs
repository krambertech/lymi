import { launch, makeContext, signIn, BASE } from './lib.mjs';
const persona = process.argv[2] || 'learner';
const paths = process.argv.slice(3);
const browser = await launch();
const ctx = await makeContext(browser);
const page = await ctx.newPage();
await signIn(page, persona, '/today');
for (const p of paths) {
  const res = await page.request.get(`${BASE}${p}`);
  console.log(`=== ${p} [${res.status()}]`);
  const t = await res.text();
  try { console.log(JSON.stringify(JSON.parse(t), null, 1)); } catch { console.log(t.slice(0, 1500)); }
}
await browser.close();
