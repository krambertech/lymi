import { testRule } from "../test/run.mjs";

const filename = "review.spec.ts";

testRule("no-flaky-masks", {
  message:
    "A sleep, a retry, a slow or a fixme makes a flaky test pass without fixing it. Wait for " +
    "the state the next step needs, such as a response, focus or a visible row; fix the cause; " +
    "or delete the test and record the coverage lost (docs/testing.md#flaky-tests). A wait " +
    "that proves nothing happens takes an oxlint-disable-next-line saying so.",
  valid: [
    { filename, code: 'await expect(page.getByRole("row")).toBeVisible();' },
    { filename, code: 'test.describe.configure({ mode: "serial" });' },
    { filename, code: 'test.describe.configure({ "retries": 2 });' },
    { filename, code: "describe.configure({ retries: 1 });" },
    { filename, code: "await page?.waitForTimeout(500);" },
    { filename, code: "test.slow?.();" },
  ],
  invalid: [
    { filename, code: "await page.waitForTimeout(500);", errors: ["page.waitForTimeout(500)"] },
    {
      filename,
      code: "test.describe.configure({ retries: 2 });",
      errors: ["test.describe.configure({ retries: 2 })"],
    },
    {
      filename,
      code: 'test.describe.configure({ mode: "serial", retries });',
      errors: ['test.describe.configure({ mode: "serial", retries })'],
    },
    { filename, code: "test.slow();", errors: ["test.slow()"] },
    {
      filename,
      code: 'test.slow(browserName === "webkit", "Slow on WebKit");',
      errors: ['test.slow(browserName === "webkit", "Slow on WebKit")'],
    },
    {
      filename,
      code: 'test.fixme("adds a card", async () => {});',
      errors: ['test.fixme("adds a card", async () => {})'],
    },
    { filename, code: "test.fixme();", errors: ["test.fixme()"] },
  ],
});
