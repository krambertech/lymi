// Starts a packaged Lymi.app and fails unless it loads the product with the bridge in place: the
// check that an Electron upgrade, the fuses or signing left the app working. README.md.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [appPath] = process.argv.slice(2);
if (!appPath) throw new Error("Usage: launch-check.js <path to Lymi.app>");
const PRODUCT = "https://my.lymi.app";
const PORT = 9_571;
// The Intel build runs under Rosetta, whose first start translates Electron and took a minute on CI.
const TIMEOUT_MS = 180_000;

const profile = mkdtempSync(join(tmpdir(), "lymi-launch-"));
const child = spawn(
  join(appPath, "Contents", "MacOS", "Lymi"),
  // A mock keychain, or an unsigned copy asks for and claims the installed app's "Lymi Safe Storage".
  [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--use-mock-keychain"],
  { stdio: "inherit" },
);
let exited = null;
child.on("exit", (code, signal) => {
  exited = signal ?? code;
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = Date.now() + TIMEOUT_MS;

async function check() {
  let browser;
  while (!browser) {
    if (exited !== null) throw new Error(`Lymi quit at start (${exited})`);
    if (Date.now() > deadline) throw new Error("Lymi never opened its debugging port");
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => null);
    if (!browser) await sleep(500);
  }
  // The quick-add panel loads at start, hidden, so a window is there without a press.
  while (Date.now() < deadline) {
    for (const page of browser.contexts().flatMap((context) => context.pages())) {
      if (!page.url().startsWith(`${PRODUCT}/`)) continue;
      await page.waitForLoadState("load");
      const version = await page.evaluate(() => window.lymiDesktop?.version);
      if (typeof version === "number") return `${page.url()} has bridge version ${version}`;
    }
    if (exited !== null) throw new Error(`Lymi quit (${exited})`);
    await sleep(500);
  }
  const urls = browser.contexts().flatMap((context) => context.pages().map((page) => page.url()));
  throw new Error(`No product page with the bridge; pages: ${urls.join(", ") || "none"}`);
}

try {
  console.log(`Launch check passed: ${await check()}`);
  process.exitCode = 0;
} catch (error) {
  console.error(`Launch check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  child.kill();
  // A Lymi stuck on a modal ignores SIGTERM, and waiting on it held a release for an hour.
  const killed = setTimeout(() => child.kill("SIGKILL"), 5_000);
  if (exited === null) await new Promise((resolve) => child.once("exit", resolve));
  clearTimeout(killed);
  rmSync(profile, { recursive: true, force: true });
}
