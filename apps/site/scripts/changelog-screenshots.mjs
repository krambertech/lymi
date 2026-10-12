// Takes an update's screenshot from the running product, in every app language and both themes.
// The recipe is `screenshot.capture` in the update's en.md; docs/design/changelog.md has the rules.
// Usage: pnpm --filter @lymi/web dev --port 5241, then
//        pnpm --filter @lymi/site changelog:screenshots 2026-10-11-welcome [--url http://localhost:5241]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { parse } from "yaml";

const LOCALES = ["en", "uk", "ru"];
const THEMES = ["light", "dark"];
const FRAMES = {
  window: { viewport: { width: 1280, height: 820 }, isMobile: false },
  panel: { viewport: { width: 1280, height: 1600 }, isMobile: false },
  phone: { viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true },
};

const args = process.argv.slice(2);
const folder = args.find((arg) => !arg.startsWith("--"));
const urlFlag = args.indexOf("--url");
const origin = urlFlag >= 0 ? args[urlFlag + 1] : (process.env.LYMI_URL ?? "http://localhost:5241");
if (!folder) throw new Error("Name the update's folder, such as 2026-10-11-welcome.");

const dir = join(dirname(fileURLToPath(import.meta.url)), "../src/content/changelog", folder);
const source = readFileSync(join(dir, "en.md"), "utf8");
const front = parse(source.split(/^---$/m)[1] ?? "");
const shot = front?.screenshot;
if (!shot?.capture) throw new Error(`${folder}/en.md has no screenshot.capture to follow.`);
const { persona = "learner", path, element, prepare = [], keys = [], wait = 600 } = shot.capture;
// A change that only shows in one theme, such as the dark room, is taken in that theme for both files.
const only = shot.capture.theme;
const frame = FRAMES[shot.frame];
if (!frame || !path)
  throw new Error("screenshot needs a frame (window or phone) and capture.path.");

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
try {
  for (const locale of LOCALES) {
    for (const file of THEMES) {
      const theme = only ?? file;
      const context = await browser.newContext({
        ...frame,
        deviceScaleFactor: 2,
        colorScheme: theme,
        reducedMotion: "reduce",
        timezoneId: "Europe/Tallinn",
      });
      await context.addInitScript((t) => localStorage.setItem("lymi-theme", t), theme);
      const page = await context.newPage();
      // Reseed so every language and theme starts from the same persona data.
      await page.goto(`${origin}/api/dev/sign-in?as=${persona}&reset=1&returnTo=/today`);
      const call = (route, method, body) =>
        page.evaluate(
          async ([r, m, b]) => {
            const res = await fetch(r, {
              method: m,
              headers: { "content-type": "application/json" },
              body: JSON.stringify(b ?? {}),
            });
            if (!res.ok) throw new Error(`${m} ${r} answered ${res.status}`);
          },
          [route, method, body],
        );
      await call("/api/settings", "PATCH", { appLanguage: locale });
      for (const step of prepare) {
        const [route, body] = typeof step === "string" ? [step] : [step.route, step.body];
        await call(route, "POST", body);
      }
      await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: ".dev-skin{display:none!important}" });
      for (const key of keys) {
        await page.keyboard.press(key);
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(wait);
      const target = element ? page.locator(element).first() : page;
      const png = await target.screenshot({ animations: "disabled", caret: "hide" });
      const out = join(dir, `${locale}-${file}.webp`);
      writeFileSync(out, await sharp(png).webp({ quality: 86 }).toBuffer());
      console.log(`Wrote ${folder}/${locale}-${file}.webp`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
