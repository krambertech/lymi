import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  timeout: process.env.CI ? 60_000 : 30_000,
  retries: process.env.CI ? 1 : 0,
  // Three of the runner's four cores, leaving the fourth for the servers; what makes parallel
  // files safe, and why the tests inside one stay serial, is in docs/testing.md.
  workers: process.env.CI ? 3 : undefined,
  globalSetup: "./e2e/global-setup.ts",
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "on-first-retry",
    // A part that is still moving is not clickable, and no journey asserts an animation. docs/testing.md.
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
    url: "http://localhost:4173/api/health",
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
    timeout: 120_000,
  },
});
