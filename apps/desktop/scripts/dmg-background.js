// Renders the download window's background, `assets/dmg-background.tiff`, at 1x and 2x from Lymi's
// own tokens and type. Finder draws the two icons and their names over it. README.md.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const font = createRequire(join(root, "apps/web/package.json")).resolve(
  "@fontsource-variable/onest/files/onest-latin-wght-normal.woff2",
);
const tokens = join(root, "packages/design/tokens.css");

// The window is 640 by 400 points; the icons' centres, (180, 214) and (460, 214), are in scripts/dmg.py.
// The light room with the lantern lit: Lymi's icon is the lantern, so its light pools around it,
// and the arrow brightens as it carries that light to the folder it should land in.
const html = `<!doctype html>
<html data-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="${pathToFileURL(tokens)}">
<style>
  @font-face { font-family: Onest; src: url("${pathToFileURL(font)}") format("woff2"); font-weight: 400 600; }
  html, body { margin: 0; width: 640px; height: 400px; overflow: hidden; }
  body {
    background:
      radial-gradient(circle 170px at 180px 214px, var(--pool), transparent 72%),
      radial-gradient(circle 300px at 180px 214px, var(--amber-soft), transparent 80%),
      var(--canvas);
    color: var(--text); font-family: Onest, sans-serif; -webkit-font-smoothing: antialiased;
    position: relative;
  }
  h1 { position: absolute; inset: 64px 0 auto; margin: 0; text-align: center;
    font-size: 22px; font-weight: 550; letter-spacing: -0.02em; }
  svg.art { position: absolute; inset: 0; }
</style></head>
<body>
  <h1>Drag Lymi into Applications</h1>
  <svg class="art" width="640" height="400" viewBox="0 0 640 400" fill="none">
    <defs>
      <linearGradient id="travel" x1="248" y1="0" x2="372" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="var(--amber)" stop-opacity="0"/>
        <stop offset="0.55" stop-color="var(--amber)"/>
        <stop offset="1" stop-color="var(--amber-mark)"/>
      </linearGradient>
    </defs>
    <!-- Where to let go: a drop target around the folder Finder draws. -->
    <rect x="386" y="142" width="148" height="170" rx="30" stroke="var(--edge-2)" stroke-width="1.5" stroke-dasharray="5 6"/>
    <path d="M248 218 C286 188 336 188 370 212" stroke="url(#travel)" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M367.2 201.8 L371.5 213 L359.5 213.3" stroke="var(--amber-mark)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</body></html>`;

const stage = mkdtempSync(join(tmpdir(), "lymi-dmg-background-"));
// Opened as a file, since a page set from a string may not read the tokens and font from disk.
const source = join(stage, "background.html");
writeFileSync(source, html);
const browser = await chromium.launch();
try {
  const shots = [];
  for (const scale of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 640, height: 400 },
      deviceScaleFactor: scale,
    });
    await page.goto(pathToFileURL(source).toString());
    await page.evaluate(() => document.fonts.ready);
    const path = join(stage, scale === 1 ? "background.png" : "background@2x.png");
    await page.screenshot({ path });
    shots.push(path);
  }
  // One TIFF holding both sizes, so Finder draws the sharp one on a Retina screen.
  execFileSync("tiffutil", [
    "-cathidpicheck",
    ...shots,
    "-out",
    join(here, "..", "assets", "dmg-background.tiff"),
  ]);
} finally {
  await browser.close();
  rmSync(stage, { recursive: true });
}
