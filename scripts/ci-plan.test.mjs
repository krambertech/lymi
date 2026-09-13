import assert from "node:assert/strict";
import test from "node:test";
import { createCiPlan } from "./ci-plan.mjs";

test("production pull requests run Chromium and a deployment package check", () => {
  const plan = createCiPlan({
    eventName: "pull_request",
    changedPaths: ["apps/web/src/client/routes/today.tsx"],
  });

  assert.equal(plan.runE2E, true);
  assert.equal(plan.browsers, "chromium");
  assert.equal(plan.playwrightArgs, "--project=chromium");
  assert.equal(plan.coverage, "Chromium");
  assert.equal(plan.runDeployCheck, true);
  assert.equal(plan.runAppPreview, true);
  assert.equal(plan.runSitePreview, false);
});

test("public-site pull requests schedule a preview after the base gates", () => {
  const plan = createCiPlan({
    eventName: "pull_request",
    changedPaths: ["apps/site/src/pages/index.astro"],
  });

  assert.equal(plan.runE2E, true);
  assert.equal(plan.runDeployCheck, true);
  assert.equal(plan.runAppPreview, false);
  assert.equal(plan.runSitePreview, true);
});

test("documentation pull requests skip browser and deployment checks", () => {
  const plan = createCiPlan({
    eventName: "pull_request",
    changedPaths: ["docs/proposals/shared-decks.md"],
  });

  assert.equal(plan.runE2E, false);
  assert.equal(plan.coverage, "No browser E2E");
  assert.equal(plan.runDeployCheck, false);
  assert.equal(plan.runAppPreview, false);
  assert.equal(plan.runSitePreview, false);
});

test("main receives full cross-browser and deployment coverage", () => {
  const plan = createCiPlan({ eventName: "push" });

  assert.equal(plan.runE2E, true);
  assert.equal(plan.browsers, "chromium webkit");
  assert.equal(plan.playwrightArgs, "");
  assert.equal(plan.coverage, "Chromium + WebKit");
  assert.equal(plan.runDeployCheck, true);
  assert.equal(plan.runAppPreview, false);
  assert.equal(plan.runSitePreview, false);
});

test("manual runs are full by default and can explicitly skip browser E2E", () => {
  assert.equal(createCiPlan({ eventName: "workflow_dispatch" }).coverage, "Chromium + WebKit");

  const optedOut = createCiPlan({ eventName: "workflow_dispatch", manualE2E: false });
  assert.equal(optedOut.runE2E, false);
  assert.equal(optedOut.runDeployCheck, true);
  assert.equal(optedOut.runAppPreview, false);
  assert.equal(optedOut.runSitePreview, false);
});

test("shared changes can schedule both previews", () => {
  const plan = createCiPlan({
    eventName: "pull_request",
    changedPaths: ["packages/core/src/index.ts"],
  });

  assert.equal(plan.runAppPreview, true);
  assert.equal(plan.runSitePreview, true);
});
