import assert from "node:assert/strict";
import test from "node:test";
import { flakyTests, issueBody, issueTitle, plan } from "./flaky-issues.mjs";

const run = {
  id: "42",
  sha: "0123456789abcdef",
  repoUrl: "https://github.com/o/r",
  url: "https://github.com/o/r/actions/runs/42",
};

const journey = {
  file: "e2e/review-complete.spec.ts",
  line: 108,
  title: "leaving mid-review ends on the success screen",
  project: "chromium",
  error: "Error: expect(locator).toBeVisible() failed",
};

test("one entry per test, whatever browsers flaked it", () => {
  const tests = flakyTests({
    shardOutcomes: [
      { shard: 1, flakyTests: [journey] },
      { shard: 2, flakyTests: [{ ...journey, project: "webkit" }] },
    ],
    components: [
      {
        file: "apps/web/src/client/components/command-menu.browser.test.tsx",
        title: "a failed search",
        project: "components (touch)",
      },
    ],
  });

  assert.equal(tests.length, 2);
  assert.deepEqual(
    tests[0].seen.map((seen) => seen.project),
    ["chromium", "webkit"],
  );
  assert.equal(tests[1].kind, "component");
});

test("an issue carries a marker that finds it again, and the run that flaked it", () => {
  const [flaky] = flakyTests({ shardOutcomes: [{ flakyTests: [journey] }] });
  const body = issueBody(flaky, run);

  assert.match(body, /<!-- flaky-test: e2e\/review-complete\.spec\.ts › leaving mid-review/);
  assert.match(body, /\[Run 42\]\(https:\/\/github\.com\/o\/r\/actions\/runs\/42\) on `012345678`/);
  assert.match(body, /docs\/testing\.md#flaky-tests/);
  assert.equal(issueTitle(flaky), "Flaky test: leaving mid-review ends on the success screen");
});

test("a new flaky test opens an issue, an open one gets a comment, a closed one reopens", () => {
  const [a, b, c] = flakyTests({
    shardOutcomes: [
      { flakyTests: [journey, { ...journey, title: "second" }, { ...journey, title: "third" }] },
    ],
  });
  const issues = [
    { number: 7, state: "closed", body: issueBody(b, run) },
    { number: 9, state: "open", body: issueBody(b, run) },
    { number: 3, state: "closed", body: issueBody(c, run) },
    { number: 5, state: "closed", state_reason: "completed", body: issueBody(c, run) },
  ];

  assert.deepEqual(
    plan([a, b, c], issues).map(({ action, number }) => ({ action, number })),
    [
      { action: "create", number: undefined },
      { action: "comment", number: 9 },
      { action: "reopen", number: 5 },
    ],
  );
});

test("a test whose issue was closed as not planned gets a comment, not a reopen", () => {
  const [flaky] = flakyTests({ shardOutcomes: [{ flakyTests: [journey] }] });
  const issues = [
    { number: 4, state: "closed", state_reason: "not_planned", body: issueBody(flaky, run) },
  ];

  assert.deepEqual(
    plan([flaky], issues).map(({ action, number }) => ({ action, number })),
    [{ action: "comment", number: 4 }],
  );
});
