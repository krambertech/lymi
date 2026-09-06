#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const labels = {
  success: "Passed",
  failure: "Failed",
  skipped: "Skipped",
  cancelled: "Cancelled",
  unknown: "Not reached",
};

function outcome(value) {
  return labels[value] ?? labels.unknown;
}

export function renderCiSummary(env) {
  const coverage = env.COVERAGE || "Not selected";
  const reason =
    env.PLAN_REASON || "An earlier gate stopped before the coverage plan was selected.";

  return [
    "## CI evidence",
    "",
    `**Browser coverage:** ${coverage}`,
    "",
    reason,
    "",
    "| Gate | Outcome |",
    "| --- | --- |",
    `| Pull request title | ${outcome(env.TITLE_OUTCOME)} |`,
    `| Dependencies | ${outcome(env.DEPENDENCIES_OUTCOME)} |`,
    `| Formatting and lint | ${outcome(env.CHECK_OUTCOME)} |`,
    `| Production build | ${outcome(env.BUILD_OUTCOME)} |`,
    `| TypeScript | ${outcome(env.TYPECHECK_OUTCOME)} |`,
    `| Unit tests | ${outcome(env.TEST_OUTCOME)} |`,
    `| Deployment package | ${outcome(env.DEPLOY_OUTCOME)} |`,
    `| Browser installation | ${outcome(env.BROWSERS_OUTCOME)} |`,
    `| Browser E2E | ${outcome(env.E2E_OUTCOME)} |`,
    "",
    "A green Chromium pull-request run is not full cross-browser evidence. Chromium + WebKit run on every push to `main` and through `/e2e`.",
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    throw new Error("GITHUB_STEP_SUMMARY is required");
  }
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderCiSummary(process.env));
}
