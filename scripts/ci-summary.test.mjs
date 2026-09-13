import assert from "node:assert/strict";
import test from "node:test";
import { ciFailures, renderCiSummary } from "./ci-summary.mjs";

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
    I18N_OUTCOME: "success",
    MIGRATIONS_OUTCOME: "success",
    BUILD_OUTCOME: "success",
    BOUNDARIES_OUTCOME: "success",
    TYPECHECK_OUTCOME: "failure",
    TEST_OUTCOME: "skipped",
    DEPLOY_PRODUCT_OUTCOME: "skipped",
    DEPLOY_SITE_OUTCOME: "skipped",
    BROWSER_DEPENDENCIES_OUTCOME: "success",
    BROWSERS_OUTCOME: "skipped",
    E2E_OUTCOME: "skipped",
  });

  assert.match(summary, /\*\*Browser coverage:\*\* Chromium/);
  assert.match(summary, /\*\*Public-site preview:\*\* Scheduled after quality checks/);
  assert.match(summary, /\*\*Product-app preview:\*\* Scheduled after quality checks/);
  assert.match(summary, /\| Quality checks \| Failed \|/);
  assert.match(summary, /\| TypeScript \| Failed \|/);
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
      RUN_E2E: "true",
      BROWSER_RESULT: "skipped",
    }),
    ["quality checks", "browser E2E"],
  );
});

test("the final result rejects a missing coverage decision", () => {
  assert.deepEqual(
    ciFailures({
      PLAN_RESULT: "success",
      QUALITY_RESULT: "success",
      BROWSER_RESULT: "skipped",
    }),
    ["coverage planning"],
  );
});
