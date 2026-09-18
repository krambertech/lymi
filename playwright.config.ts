import { defineConfig, devices } from "@playwright/test";
import { e2eProductUrl } from "./e2e/ports.mjs";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  timeout: process.env.CI ? 60_000 : 30_000,
  // A CI runner takes about three times as long as a developer's machine for this suite, so an
  // assertion's default five seconds is a budget tuned to the wrong machine. docs/testing.md.
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  retries: process.env.CI ? 1 : 0,
  // The journeys share one Vite dev server, one Worker and one D1. Accounts are already keyed
  // per test, but the server is not: concurrent workers starve it. docs/testing.md.
  workers: 1,
  reporter: process.env.CI
    ? // The JSON report is what `scripts/e2e-shard-outcome.mjs` reads, so a red gate can name the
      // shard and its tests once the shards have gone their separate ways.
      [
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "test-results/results.json" }],
      ]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eProductUrl,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "on-first-retry",
    // Measured, not assumed: the same suite failed 10 under this and 24 at full motion. docs/testing.md.
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["iPhone 15"] },
    },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `${e2eProductUrl}/api/health`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
    timeout: 120_000,
  },
});
