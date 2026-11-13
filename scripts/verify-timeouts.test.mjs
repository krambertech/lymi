import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium, expect } from "@playwright/test";
import { timedOut } from "../.agents/skills/verify/scripts/timeouts.mjs";

// Real Playwright errors, so an upgrade that rewords them fails here instead of mislabelling steps.
const quick = expect.configure({ timeout: 300 });
let browser;
let page;

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent("<main><p>Try to remember, then reveal the answer</p></main>");
});
after(() => browser?.close());

const thrown = async (run) => {
  try {
    await run();
  } catch (error) {
    return error;
  }
  assert.fail("expected the call to throw");
};

test("an action that waits out its limit timed out", async () => {
  const error = await thrown(() =>
    page.getByRole("button", { name: "Add" }).click({ timeout: 300 }),
  );
  assert.equal(timedOut(error), true);
});

test("an assertion whose locator never appears timed out", async () => {
  const error = await thrown(() => quick(page.getByText(/then tap the card/)).toBeVisible());
  assert.equal(timedOut(error), true);
});

test("an assertion that finds its locator holding another value failed", async () => {
  const error = await thrown(() => quick(page.getByRole("main")).toContainText("Added"));
  assert.equal(timedOut(error), false);
});

test("a value assertion on API data failed", async () => {
  const error = await thrown(() => expect([1, 2]).toHaveLength(1));
  assert.equal(timedOut(error), false);
});
