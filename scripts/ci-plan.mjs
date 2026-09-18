#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { requiresAppPreview } from "./app-preview-impact.mjs";
import { requiresE2E } from "./e2e-impact.mjs";
import { requiresSitePreview } from "./site-preview-impact.mjs";

// Each shard pays the whole `scripts/e2e-server.mjs` setup, so the wall clock it saves runs out
// well before the runner minutes it spends. Three is measured, not a law. docs/testing.md.
export const e2eShardCount = 3;

const shardMatrix = JSON.stringify(Array.from({ length: e2eShardCount }, (_, index) => index + 1));

function shardedPlan(plan) {
  return { ...plan, shards: e2eShardCount, shardMatrix };
}

function fullPlan(reason) {
  return shardedPlan({
    runE2E: true,
    browsers: "chromium webkit",
    playwrightArgs: "",
    coverage: "Chromium + WebKit",
    runDeployCheck: true,
    runAppPreview: false,
    runSitePreview: false,
    reason,
  });
}

export function createCiPlan({ eventName, changedPaths = [], manualE2E = true }) {
  if (eventName === "pull_request") {
    const runAppPreview = requiresAppPreview(changedPaths);
    const runSitePreview = requiresSitePreview(changedPaths);
    if (!requiresE2E(changedPaths)) {
      return shardedPlan({
        runE2E: false,
        browsers: "",
        playwrightArgs: "",
        coverage: "No browser E2E",
        runDeployCheck: false,
        runAppPreview,
        runSitePreview,
        reason: "This pull request changes no production-affecting paths.",
      });
    }

    return shardedPlan({
      runE2E: true,
      browsers: "chromium",
      playwrightArgs: "--project=chromium",
      coverage: "Chromium",
      runDeployCheck: true,
      runAppPreview,
      runSitePreview,
      reason: "This pull request changes production-affecting paths.",
    });
  }

  if (eventName === "workflow_dispatch" && !manualE2E) {
    return shardedPlan({
      runE2E: false,
      browsers: "",
      playwrightArgs: "",
      coverage: "No browser E2E",
      runDeployCheck: true,
      runAppPreview: false,
      runSitePreview: false,
      reason: "The manually dispatched run explicitly disabled browser E2E.",
    });
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
    shards: String(plan.shards),
    shard_matrix: plan.shardMatrix,
    browsers: plan.browsers,
    playwright_args: plan.playwrightArgs,
    coverage: plan.coverage,
    run_deploy_check: String(plan.runDeployCheck),
    run_app_preview: String(plan.runAppPreview),
    run_site_preview: String(plan.runSitePreview),
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
    `CI plan: ${plan.coverage}${
      plan.runE2E ? ` across ${plan.shards} shards` : ""
    }; deployment package check ${
      plan.runDeployCheck ? "enabled" : "skipped"
    }; app preview ${plan.runAppPreview ? "enabled" : "skipped"}; public-site preview ${
      plan.runSitePreview ? "enabled" : "skipped"
    }. ${plan.reason}\n`,
  );
}
