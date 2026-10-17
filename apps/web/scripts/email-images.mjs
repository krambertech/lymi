// Draws the email's brand lantern in its pool of light, and the lockup, as PNGs: mail clients ignore SVG and gradients.
// Run with `node apps/web/scripts/email-images.mjs` after changing a lantern SVG or the pool token.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../public/brand/", import.meta.url));
const tokens = await readFile(
  new URL("../../../packages/design/src/tokens.gen.ts", import.meta.url),
  "utf8",
);
const pools = [...tokens.matchAll(/^ {4}pool: "(#[0-9a-f]{8})"/gm)].map((match) => match[1]);
const rooms = [
  { name: "light", pool: pools[0] },
  { name: "dark", pool: pools[1] },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 240, height: 160 } });
for (const room of rooms) {
  const svg = await readFile(`${root}lantern-${room.name}.svg`, "utf8");
  await page.setContent(
    `<body style="margin:0;background:transparent"><div style="width:240px;height:160px;display:flex;align-items:center;justify-content:center;background:radial-gradient(closest-side,${room.pool},transparent) center 62%/220px 150px no-repeat"><div style="width:84px;height:84px">${svg.replace("<svg ", '<svg width="84" height="84" ')}</div></div></body>`,
  );
  await page.screenshot({ path: `${root}email/lantern-${room.name}.png`, omitBackground: true });
}
// The lockup heads an email that opens on something other than the lantern.
const lockup = await browser.newPage({ deviceScaleFactor: 3, viewport: { width: 72, height: 36 } });
for (const room of rooms) {
  const svg = await readFile(`${root}lockup-${room.name}.svg`, "utf8");
  await lockup.setContent(
    `<body style="margin:0;background:transparent">${svg.replace('width="202" height="100"', 'width="72" height="36"')}</body>`,
  );
  await lockup.screenshot({ path: `${root}email/lockup-${room.name}.png`, omitBackground: true });
}
await browser.close();
