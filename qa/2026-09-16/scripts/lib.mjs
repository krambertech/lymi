import pw from '/home/user/lymi/node_modules/@playwright/test/index.js';
const { chromium } = pw;
import fs from 'node:fs';
import path from 'node:path';

export const BASE = 'http://localhost:5241';
export const EXEC = '/opt/pw-browsers/chromium';
export const SHOTS = '/tmp/claude-0/-home-user-lymi/1f042abe-76f6-5dfb-a66e-93addbbfed97/scratchpad/qa/shots';

export const VIEWPORTS = {
  phone: { width: 390, height: 844 },      // iPhone 14
  phoneSmall: { width: 320, height: 568 }, // iPhone SE 1st gen
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1280, height: 800 },
  desktop: { width: 1920, height: 1080 },
};

export async function launch() {
  return chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
}

export async function makeContext(browser, { viewport = VIEWPORTS.laptop, colorScheme = 'light', locale = 'en-US', isMobile = false } = {}) {
  const ctx = await browser.newContext({
    viewport, colorScheme, locale,
    deviceScaleFactor: 2,
    hasTouch: isMobile,
    isMobile,
    timezoneId: 'Europe/Kyiv',
  });
  return ctx;
}

export function collect(page, log) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') log.console.push({ type: m.type(), text: m.text().slice(0, 500) });
  });
  page.on('pageerror', (e) => log.pageerrors.push(String(e).slice(0, 500)));
  page.on('requestfailed', (r) => log.failed.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) log.http.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
}

export function newLog() { return { console: [], pageerrors: [], failed: [], http: [] }; }

export async function signIn(page, persona, returnTo = '/today', extra = '') {
  await page.goto(`${BASE}/api/dev/sign-in?as=${persona}&returnTo=${encodeURIComponent(returnTo)}${extra}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
}

export async function shot(page, name, opts = {}) {
  const file = path.join(SHOTS, `${name}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? true, animations: 'disabled' });
  return file;
}

export async function settle(page, ms = 700) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}
