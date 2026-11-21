import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(join(here, "../../../web/package.json"))("playwright");
const asked = process.argv.slice(2);
const locales = asked.length ? asked : ["en", "uk", "ru"];
const out = join(here, "out");

const browser = await chromium.launch();
const page = await browser.newPage();

async function open(file, params, viewport) {
  const url = new URL(pathToFileURL(join(here, file)));
  url.search = new URLSearchParams(params).toString();
  await page.setViewportSize(viewport);
  await page.goto(url.href);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
}

async function renderSet(lang, size, width, height, dir) {
  await open("set.html", { lang, size }, { width: width * 9, height });
  await page.evaluate(() => window.fit());
  const panels = await page.evaluate(() => window.PANELS);
  mkdirSync(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < panels; i++) {
    const file = join(dir, `${String(i + 1).padStart(2, "0")}.jpg`);
    await page.screenshot({
      path: file,
      type: "jpeg",
      quality: 92,
      clip: { x: i * width, y: 0, width, height },
    });
    files.push(file);
  }
  return files;
}

for (const lang of locales) {
  const large = await renderSet(lang, "iphone", 1320, 2868, join(out, lang, "6.9"));
  mkdirSync(join(out, lang, "6.3"), { recursive: true });
  for (const file of large) {
    execFileSync("sips", ["-z", "2622", "1206", file, "--out", file.replace("/6.9/", "/6.3/")], {
      stdio: "ignore",
    });
  }
  await renderSet(lang, "play", 1440, 2560, join(out, lang, "play"));
  await open("feature.html", { lang }, { width: 1024, height: 500 });
  mkdirSync(join(out, "play-feature"), { recursive: true });
  await page.screenshot({
    path: join(out, "play-feature", `${lang}.jpg`),
    type: "jpeg",
    quality: 92,
  });
  console.log(lang);
}
await browser.close();
