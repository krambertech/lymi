import assert from "node:assert/strict";
import test from "node:test";
import { ciFailures, readShardOutcomes, renderCiSummary } from "./ci-summary.mjs";

test("the summary makes browser coverage and failed gates explicit", () => {
  const summary = renderCiSummary({
    COVERAGE: "Chromium",
    APP_PREVIEW: "true",
    SITE_PREVIEW: "true",
    RUN_E2E: "true",
    PLAN_RESULT: "success",
    QUALITY_RESULT: "failure",
    BROWSER_RESULT: "success",
    PLAN_REASON: "This pull request changes production-affecting paths.",
    TITLE_OUTCOME: "success",
    DEPENDENCIES_OUTCOME: "success",
    CHECK_OUTCOME: "success",
    MODELS_RESULT: "failure",
    I18N_OUTCOME: "success",
    MIGRATIONS_OUTCOME: "success",
    BUILD_OUTCOME: "success",
    BOUNDARIES_OUTCOME: "success",
    TYPECHECK_OUTCOME: "failure",
    TEST_OUTCOME: "skipped",
    DEPLOY_PRODUCT_OUTCOME: "skipped",
    DEPLOY_SITE_OUTCOME: "skipped",
  });

  assert.match(summary, /\*\*Browser coverage:\*\* Chromium/);
  assert.match(summary, /\*\*Public-site preview:\*\* Scheduled after quality checks/);
  assert.match(summary, /\*\*Product-app preview:\*\* Scheduled after quality checks/);
  assert.match(summary, /\| Quality checks \| Failed \|/);
  assert.match(summary, /\| TypeScript \| Failed \|/);
  assert.match(summary, /\| Flow models \| Failed \|/);
  assert.match(summary, /\| Interface strings \| Passed \|/);
  assert.match(summary, /\| Migration safety \| Passed \|/);
  assert.match(summary, /green Chromium pull-request run is not full cross-browser evidence/);
});

test("the summary explains when an earlier gate prevented policy selection", () => {
  const summary = renderCiSummary({});

  assert.match(summary, /\*\*Browser coverage:\*\* Not selected/);
  assert.match(summary, /earlier gate stopped/);
});

test("the final result accepts a deliberately skipped browser job", () => {
  assert.deepEqual(
    ciFailures({
      PLAN_RESULT: "success",
      QUALITY_RESULT: "success",
      MODELS_RESULT: "success",
      RUN_E2E: "false",
      BROWSER_RESULT: "skipped",
    }),
    [],
  );
});

test("the final result rejects failed or missing required jobs", () => {
  assert.deepEqual(
    ciFailures({
      PLAN_RESULT: "success",
      QUALITY_RESULT: "failure",
      MODELS_RESULT: "cancelled",
      RUN_E2E: "true",
      BROWSER_RESULT: "skipped",
    }),
    ["quality checks", "flow models", "browser E2E"],
  );
});

test("the final result rejects a missing coverage decision", () => {
  assert.deepEqual(
    ciFailures({
      PLAN_RESULT: "success",
      QUALITY_RESULT: "success",
      MODELS_RESULT: "success",
      BROWSER_RESULT: "skipped",
    }),
    ["coverage planning"],
  );
});

test("the summary says a draft pull request waits for review before its app preview", () => {
  const summary = renderCiSummary({ APP_PREVIEW: "true", DRAFT: "true" });
  assert.match(
    summary,
    /\*\*Product-app preview:\*\* Skipped until the pull request is ready for review/,
  );
});

test("the summary names the shard and the tests behind a red browser gate", () => {
  const summary = renderCiSummary(
    {
      COVERAGE: "Chromium",
      RUN_E2E: "true",
      SHARDS: "3",
      PLAN_RESULT: "success",
      QUALITY_RESULT: "success",
      BROWSER_RESULT: "failure",
    },
    [
      {
        shard: 1,
        shards: 3,
        outcome: "success",
        reported: true,
        passed: 21,
        failed: 0,
        flaky: 0,
        skipped: 0,
        failures: [],
      },
      {
        shard: 2,
        shards: 3,
        outcome: "failure",
        reported: true,
        passed: 19,
        failed: 1,
        flaky: 0,
        skipped: 0,
        failures: ["deck-creation.spec.ts:42 — a learner can add a card"],
        truncatedFailures: 0,
      },
      {
        shard: 3,
        shards: 3,
        outcome: "success",
        reported: true,
        passed: 21,
        failed: 0,
        flaky: 0,
        skipped: 0,
        failures: [],
      },
    ],
  );

  assert.match(summary, /\| Browser E2E \(all shards\) \| Failed \|/);
  assert.match(summary, /\| 2 of 3 \| Failed \| 19 \| 1 \| 0 \| 0 \|/);
  assert.match(summary, /\*\*Across 3 of 3 shards:\*\* 61 passed, 1 failed/);
  assert.match(summary, /Failed in shard 2 of 3:/);
  assert.match(summary, /a learner can add a card/);
});

test("a shard that never reported is named rather than silently missing", () => {
  const summary = renderCiSummary({ RUN_E2E: "true", SHARDS: "3", BROWSER_RESULT: "cancelled" }, [
    {
      shard: 1,
      shards: 3,
      outcome: "success",
      reported: true,
      passed: 21,
      failed: 0,
      flaky: 0,
      skipped: 0,
      failures: [],
    },
  ]);

  assert.match(summary, /\| 2 of 3 \| Not reached \| — \| — \| — \| — \|/);
  assert.match(summary, /\*\*Across 1 of 3 shards:\*\*/);
});

test("a run with no browser coverage renders no shard table", () => {
  const summary = renderCiSummary({ RUN_E2E: "false", SHARDS: "3" }, []);
  assert.doesNotMatch(summary, /Browser E2E shards/);
});

test("missing shard outcomes read as none rather than throwing", () => {
  assert.deepEqual(readShardOutcomes("scripts/no-such-directory"), []);
});

test("a test that passed only on retry is named, not just counted", () => {
  const summary = renderCiSummary(
    { RUN_E2E: "true", SHARDS: "1", BROWSER_RESULT: "success" },
    [
      {
        shard: 1,
        shards: 1,
        outcome: "success",
        reported: true,
        passed: 20,
        failed: 0,
        flaky: 1,
        skipped: 0,
        failures: [],
        flakyTests: [
          {
            file: "e2e/review-complete.spec.ts",
            line: 108,
            title: "leaving mid-review ends on the success screen",
            project: "chromium",
            error: "Locator: getByText(/^2 | of 5/)",
          },
        ],
      },
    ],
    [
      {
        file: "apps/web/src/client/components/command-menu.browser.test.tsx",
        title: "a failed search still reports itself",
        project: "components (touch)",
      },
    ],
  );

  assert.match(summary, /\| Passed only on retry \| 2 tests, listed below \|/);
  assert.match(summary, /### Passed only on retry/);
  assert.match(
    summary,
    /\| leaving mid-review ends on the success screen \| `e2e\/review-complete\.spec\.ts:108` \| chromium \| Locator: getByText\(\/\^2 \\\| of 5\/\) \|/,
  );
  assert.match(summary, /command-menu\.browser\.test\.tsx` \| components \(touch\) \|/);
});

test("a run where nothing needed its retry says so", () => {
  const summary = renderCiSummary({ RUN_E2E: "false" }, [], []);
  assert.match(summary, /\| Passed only on retry \| None \|/);
  assert.doesNotMatch(summary, /### Passed only on retry/);
});

test("a flaky test whose issue could not be filed says so", () => {
  const summary = renderCiSummary(
    { RUN_E2E: "false", FLAKY_ISSUES: "failure" },
    [],
    [
      {
        file: "apps/web/src/client/x.browser.test.tsx",
        title: "x",
        project: "components (desktop)",
      },
    ],
  );
  assert.match(summary, /Filing their `flaky test` issues failed/);
});
