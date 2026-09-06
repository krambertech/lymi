#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { requiresE2E } from "./e2e-impact.mjs";

function fullPlan(reason) {
  return {
    runE2E: true,
    browsers: "chromium webkit",
    playwrightArgs: "",
    coverage: "Chromium + WebKit",
    runDeployCheck: true,
    reason,
  };
}

export function createCiPlan({ eventName, changedPaths = [], manualE2E = true }) {
  if (eventName === "pull_request") {
    if (!requiresE2E(changedPaths)) {
      return {
        runE2E: false,
        browsers: "",
        playwrightArgs: "",
        coverage: "No browser E2E",
        runDeployCheck: false,
        reason: "This pull request changes no production-affecting paths.",
      };
    }

    return {
      runE2E: true,
      browsers: "chromium",
      playwrightArgs: "--project=chromium",
      coverage: "Chromium",
      runDeployCheck: true,
      reason: "This pull request changes production-affecting paths.",
    };
  }

  if (eventName === "workflow_dispatch" && !manualE2E) {
    return {
      runE2E: false,
      browsers: "",
      playwrightArgs: "",
      coverage: "No browser E2E",
      runDeployCheck: true,
      reason: "The manually dispatched run explicitly disabled browser E2E.",
    };
  }

  if (eventName === "push") {
    return fullPlan("Every push to main receives full cross-browser coverage.");
  }

  return fullPlan("Manual runs receive full cross-browser coverage by default.");
}

function readPaths() {
  const input = readFileSync(0, "utf8");
  return input.split(input.includes("\0") ? "\0" : "\n").filter(Boolean);
}

function parseManualE2E(value) {
  return value?.toLowerCase() !== "false";
}

function writeGitHubOutputs(plan) {
  if (!process.env.GITHUB_OUTPUT) return;

  const outputs = {
    run_e2e: String(plan.runE2E),
    browsers: plan.browsers,
    playwright_args: plan.playwrightArgs,
    coverage: plan.coverage,
    run_deploy_check: String(plan.runDeployCheck),
    reason: plan.reason,
  };

  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n")}\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const plan = createCiPlan({
    eventName: process.env.EVENT_NAME ?? "workflow_dispatch",
    changedPaths: readPaths(),
    manualE2E: parseManualE2E(process.env.MANUAL_E2E),
  });
  writeGitHubOutputs(plan);
  process.stdout.write(
    `CI plan: ${plan.coverage}; deployment package check ${
      plan.runDeployCheck ? "enabled" : "skipped"
    }. ${plan.reason}\n`,
  );
}
