#!/usr/bin/env node

import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

export function readShardOutcomes(directory) {
  let names;
  try {
    names = readdirSync(directory);
  } catch {
    return [];
  }

  return names
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(directory, name), "utf8")))
    .sort((first, second) => first.shard - second.shard);
}

function count(value) {
  return typeof value === "number" ? String(value) : "—";
}

function renderShards(env, shardOutcomes) {
  if (env.RUN_E2E !== "true") return [];

  const shards = Number(env.SHARDS) || shardOutcomes.length;
  if (!shards) return [];

  const rows = [];
  for (let shard = 1; shard <= shards; shard += 1) {
    const record = shardOutcomes.find((candidate) => candidate.shard === shard);
    rows.push(
      `| ${shard} of ${shards} | ${outcome(record?.outcome)} | ${count(record?.passed)} | ${count(record?.failed)} | ${count(record?.flaky)} | ${count(record?.skipped)} |`,
    );
  }

  const total = (key) => shardOutcomes.reduce((sum, record) => sum + (record[key] ?? 0), 0);
  const reported = shardOutcomes.filter((record) => record.reported).length;

  const failures = shardOutcomes
    .filter((record) => record.failures?.length)
    .flatMap((record) => [
      "",
      `Failed in shard ${record.shard} of ${record.shards}:`,
      "",
      ...record.failures.map((failure) => `- \`${failure}\``),
      ...(record.truncatedFailures ? [`- and ${record.truncatedFailures} more in this shard`] : []),
    ]);

  return [
    "### Browser E2E shards",
    "",
    "| Shard | Result | Passed | Failed | Flaky | Skipped |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    `**Across ${reported} of ${shards} shards:** ${total("passed")} passed, ${total("failed")} failed, ${total("flaky")} flaky, ${total("skipped")} skipped.`,
    ...failures,
    "",
  ];
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

export function renderCiSummary(env, shardOutcomes = []) {
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
    `| Browser E2E (all shards) | ${outcome(env.BROWSER_RESULT)} |`,
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
    "",
    ...renderShards(env, shardOutcomes),
    "A green Chromium pull-request run is not full cross-browser evidence. Chromium + WebKit run on every push to `main` and through `/e2e`.",
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    throw new Error("GITHUB_STEP_SUMMARY is required");
  }
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    renderCiSummary(process.env, readShardOutcomes(process.env.SHARD_OUTCOMES_DIR ?? "")),
  );

  const failures = ciFailures(process.env);
  if (failures.length > 0) {
    throw new Error(`CI failed: ${failures.join(", ")}`);
  }
}
