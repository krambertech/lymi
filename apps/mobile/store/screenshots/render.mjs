// Frames the raw Simulator captures in raw/ into store screenshots: node render.mjs [style] [locale...]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// Playwright is installed with the web app's browser tests.
const { chromium } = createRequire(join(here, "../../../web/package.json"))("playwright");
const {
  style: defaultStyle,
  feature,
  shots,
} = JSON.parse(readFileSync(join(here, "shots.json"), "utf8"));
const [style = defaultStyle, ...asked] = process.argv.slice(2);
const locales = asked.length ? asked : ["en", "uk", "ru"];

const browser = await chromium.launch();
const page = await browser.newPage();

/** Renders frame.html once; JPEG, because App Store Connect rejects a PNG with an alpha channel. */
async function render(params, viewport, out) {
  const url = new URL(pathToFileURL(join(here, "frame.html")));
  url.search = new URLSearchParams(params).toString();
  await page.setViewportSize(viewport);
  await page.goto(url.href);
  await page.evaluate(() => document.fonts.ready.then(() => window.fit()));
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out, type: "jpeg", quality: 92 });
}

for (const locale of locales) {
  for (const [index, shot] of shots.entries()) {
    const caption = shot.caption[locale];
    if (!caption) continue;
    const params = {
      style,
      lang: locale,
      theme: shot.theme,
      src: pathToFileURL(join(here, "raw", locale, shot.src)).href,
      caption,
      index: String(index),
      word: shot.word?.[locale] ?? "",
    };
    const out = (size) => join(here, "out", style, locale, size, `${shot.id}.jpg`);
    // App Store Connect's large and medium Dynamic Island classes.
    await render(params, { width: 1320, height: 2868 }, out("6.9"));
    mkdirSync(dirname(out("6.3")), { recursive: true });
    execFileSync("sips", ["-z", "2622", "1206", out("6.9"), "--out", out("6.3")], {
      stdio: "ignore",
    });
    await render({ ...params, size: "play" }, { width: 1440, height: 2880 }, out("play"));
    console.log(`${style}/${locale}/${shot.id}`);
  }
  await render(
    { style: "feature", size: "feature", lang: locale, caption: feature[locale] },
    { width: 1024, height: 500 },
    join(here, "out", "play-feature", `${locale}.jpg`),
  );
}
await browser.close();
