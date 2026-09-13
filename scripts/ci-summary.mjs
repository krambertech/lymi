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

function browserOutcome(env, value) {
  return env.BROWSER_RESULT === "skipped" ? labels.skipped : outcome(value);
}

export function ciFailures(env) {
  const failures = [];

  if (env.PLAN_RESULT !== "success" || !["true", "false"].includes(env.RUN_E2E)) {
    failures.push("coverage planning");
  }
  if (env.QUALITY_RESULT !== "success") failures.push("quality checks");
  if (env.RUN_E2E === "true" && env.BROWSER_RESULT !== "success") {
    failures.push("browser E2E");
  }
  if (env.RUN_E2E === "false" && env.BROWSER_RESULT !== "skipped") {
    failures.push("browser E2E selection");
  }

  return failures;
}

export function renderCiSummary(env) {
  const coverage = env.COVERAGE || "Not selected";
  const reason =
    env.PLAN_REASON || "An earlier gate stopped before the coverage plan was selected.";
  const sitePreview =
    env.SITE_PREVIEW === "true"
      ? "Scheduled after quality checks"
      : env.SITE_PREVIEW === "false"
        ? "Not needed"
        : "Not selected";
  const appPreview =
    env.APP_PREVIEW === "true" && env.DRAFT === "true"
      ? "Skipped until the pull request is ready for review"
      : env.APP_PREVIEW === "true"
        ? "Scheduled after quality checks"
        : env.APP_PREVIEW === "false"
          ? "Not needed"
          : "Not selected";

  return [
    "## CI evidence",
    "",
    `**Browser coverage:** ${coverage}`,
    "",
    `**Public-site preview:** ${sitePreview}`,
    "",
    `**Product-app preview:** ${appPreview}`,
    "",
    reason,
    "",
    "| Job | Result |",
    "| --- | --- |",
    `| Coverage plan | ${outcome(env.PLAN_RESULT)} |`,
    `| Quality checks | ${outcome(env.QUALITY_RESULT)} |`,
    `| Browser E2E | ${outcome(env.BROWSER_RESULT)} |`,
    "",
    "| Gate | Outcome |",
    "| --- | --- |",
    `| Pull request title | ${outcome(env.TITLE_OUTCOME)} |`,
    `| Quality dependencies | ${outcome(env.DEPENDENCIES_OUTCOME)} |`,
    `| Formatting and lint | ${outcome(env.CHECK_OUTCOME)} |`,
    `| Interface strings | ${outcome(env.I18N_OUTCOME)} |`,
    `| Migration safety | ${outcome(env.MIGRATIONS_OUTCOME)} |`,
    `| Production build | ${outcome(env.BUILD_OUTCOME)} |`,
    `| Deployment boundaries | ${outcome(env.BOUNDARIES_OUTCOME)} |`,
    `| TypeScript | ${outcome(env.TYPECHECK_OUTCOME)} |`,
    `| Unit tests | ${outcome(env.TEST_OUTCOME)} |`,
    `| Product deployment package | ${outcome(env.DEPLOY_PRODUCT_OUTCOME)} |`,
    `| Public-site deployment package | ${outcome(env.DEPLOY_SITE_OUTCOME)} |`,
    `| Browser dependencies | ${browserOutcome(env, env.BROWSER_DEPENDENCIES_OUTCOME)} |`,
    `| Browser installation | ${browserOutcome(env, env.BROWSERS_OUTCOME)} |`,
    `| Browser E2E | ${browserOutcome(env, env.E2E_OUTCOME)} |`,
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

  const failures = ciFailures(process.env);
  if (failures.length > 0) {
    throw new Error(`CI failed: ${failures.join(", ")}`);
  }
}
