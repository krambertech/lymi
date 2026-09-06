import assert from "node:assert/strict";
import test from "node:test";
import { renderCiSummary } from "./ci-summary.mjs";

test("the summary makes browser coverage and failed gates explicit", () => {
  const summary = renderCiSummary({
    COVERAGE: "Chromium",
    PLAN_REASON: "This pull request changes production-affecting paths.",
    TITLE_OUTCOME: "success",
    DEPENDENCIES_OUTCOME: "success",
    CHECK_OUTCOME: "success",
    BUILD_OUTCOME: "success",
    TYPECHECK_OUTCOME: "failure",
    TEST_OUTCOME: "skipped",
    DEPLOY_OUTCOME: "skipped",
    BROWSERS_OUTCOME: "skipped",
    E2E_OUTCOME: "skipped",
  });

  assert.match(summary, /\*\*Browser coverage:\*\* Chromium/);
  assert.match(summary, /\| TypeScript \| Failed \|/);
  assert.match(summary, /green Chromium pull-request run is not full cross-browser evidence/);
});

test("the summary explains when an earlier gate prevented policy selection", () => {
  const summary = renderCiSummary({});

  assert.match(summary, /\*\*Browser coverage:\*\* Not selected/);
  assert.match(summary, /earlier gate stopped/);
});
