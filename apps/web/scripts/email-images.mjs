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
// The loose cards behind a learning email's card. Rotation is drawn here because Gmail strips it.
const WIDTH = 408;
const HEIGHT = 420;
const TOP = 40;
const piles = {
  light: {
    plate: "#ffffff",
    edge: "#2013081a",
    under: "#20130826",
    warm: "#fce6c4",
    plain: "#f2f0ec",
  },
  dark: {
    plate: "#231e1a",
    edge: "#ffffff12",
    under: "#ffffff1c",
    warm: "#4a371f",
    plain: "#2b2722",
  },
};
for (const [room, pile] of Object.entries(piles)) {
  const sheet = (left, top, width, height, turn, fill) =>
    `<div style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;border-radius:18px;background:${fill};border:1px solid ${pile.under};box-sizing:border-box;transform:rotate(${turn}deg)"></div>`;
  const sheets =
    sheet(18, TOP - 4, 372, HEIGHT + 8, -3.6, pile.warm) +
    sheet(20, TOP - 2, 368, HEIGHT + 6, 3, pile.plain);
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: { width: WIDTH, height: HEIGHT + TOP + 40 },
  });
  await page.setContent(
    `<body style="margin:0;background:transparent;position:relative">${sheets}<div style="position:absolute;left:0;top:${TOP}px;width:${WIDTH}px;height:${HEIGHT}px;border-radius:20px;background:${pile.plate};border:1px solid ${pile.edge};box-sizing:border-box"></div></body>`,
  );
  await page.screenshot({
    path: `${root}email/pile-top-${room}.png`,
    omitBackground: true,
    clip: { x: 0, y: 0, width: WIDTH, height: TOP + 22 },
  });
  await page.setContent(
    `<body style="margin:0;background:transparent;position:relative"><div style="position:absolute;left:0;top:${TOP + HEIGHT}px;width:${WIDTH}px;height:40px;overflow:hidden"><div style="position:absolute;left:0;top:-${TOP + HEIGHT}px;width:${WIDTH}px;height:${HEIGHT + TOP + 40}px">${sheets}</div></div></body>`,
  );
  await page.screenshot({
    path: `${root}email/pile-foot-${room}.png`,
    omitBackground: true,
    clip: { x: 0, y: TOP + HEIGHT, width: WIDTH, height: 18 },
  });
}
await browser.close();
