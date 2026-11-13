import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

export const title = "Daily reminder";
export const persona = "rested";
export const start = "/today";

/** Fires the Worker's cron on the local server, the one way into the dispatcher. */
const fireCron = (origin) => fetch(`${origin}/cdn-cgi/handler/scheduled`);

export default async function drive({ page, step, api, expect }) {
  const origin = new URL(page.url()).origin;
  const write = (path, method, data) => page.request.fetch(path, { method, data });
  const profile = mkdtempSync(join(tmpdir(), "lymi-reminder-"));
  // Only Google's Chrome reaches a push service; Playwright's Chromium cannot subscribe.
  const chrome = await chromium.launchPersistentContext(profile, {
    channel: "chrome",
    headless: true,
    permissions: ["notifications"],
  });
  const tab = chrome.pages()[0] ?? (await chrome.newPage());
  await chrome.addCookies(await page.context().cookies());
  await tab.goto(`${origin}/today`);

  const subscribe = async () => {
    const subscription = await tab.evaluate(async () => {
      const worker = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch("/api/push/config")).json();
      const base64 = publicKey.replace(/-/g, "+").replace(/_/g, "/");
      const key = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const made = await worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
      return made.toJSON();
    });
    const at = new Date();
    const hour = String(at.getUTCHours()).padStart(2, "0");
    const quarter = String(Math.floor(at.getUTCMinutes() / 15) * 15).padStart(2, "0");
    await write("/api/push/subscription", "DELETE", { endpoint: subscription.endpoint });
    await write("/api/push/subscription", "PUT", {
      endpoint: subscription.endpoint,
      expirationTime: null,
      keys: subscription.keys,
      reminderTime: `${hour}:${quarter}`,
      timezone: "UTC",
    });
  };
  const shown = () =>
    tab.evaluate(async () => {
      const worker = await navigator.serviceWorker.ready;
      return (await worker.getNotifications()).map((n) => ({
        title: n.title,
        body: n.body,
        url: n.data?.url,
      }));
    });

  try {
    let delivered;
    await step("The cron sends the morning after a rest day", async () => {
      await subscribe();
      await fireCron(origin);
      await expect.poll(shown, { timeout: 60_000 }).toHaveLength(1);
      [delivered] = await shown();
      expect(delivered.title).toBe("Yesterday was a rest day");
      expect(delivered.body).toMatch(/^Your streak carried on\. \d+ cards? (is|are) ready\.$/);
      return delivered;
    });

    await step("Its link opens a review", async () => {
      expect(delivered.url).toContain("lymi_reminder=after_rest");
      await tab.goto(delivered.url);
      await expect(tab.getByRole("button", { name: "Reveal the card" })).toBeVisible();
      return { url: delivered.url };
    });

    await step("A met goal stays silent with cards left", async () => {
      await write("/api/settings", "PATCH", { dailyGoal: 1 });
      const { items } = await api("/api/review/queue");
      const [first] = items;
      await write("/api/review/grade", "POST", {
        cardId: first.card.id,
        mode: first.mode,
        rating: 3,
        reviewedAt: new Date().toISOString(),
      });
      await tab.evaluate(async () => {
        const worker = await navigator.serviceWorker.ready;
        for (const n of await worker.getNotifications()) n.close();
      });
      await subscribe();
      await fireCron(origin);
      await tab.waitForTimeout(8_000);
      expect(await shown()).toEqual([]);
      return (await api("/api/dev/state")).counts;
    });
  } finally {
    await chrome.close();
    rmSync(profile, { recursive: true, force: true });
  }
}
