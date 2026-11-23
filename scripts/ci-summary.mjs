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

/** The component tests that passed only on retry, written by `apps/web/src/test/flaky-reporter.ts`. */
export function readComponentFlaky(directory) {
  try {
    return JSON.parse(readFileSync(join(directory, "flaky.json"), "utf8"));
  } catch {
    return [];
  }
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

function flakyCount(shardOutcomes, components) {
  const journeys = shardOutcomes.reduce((sum, record) => sum + (record.flakyTests?.length ?? 0), 0);
  const total = journeys + components.length;
  return total === 0 ? "None" : `${total} ${total === 1 ? "test" : "tests"}, listed below`;
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

/** Every test that failed and then passed on retry, which a green run would otherwise hide. */
function renderFlaky(env, shardOutcomes, components) {
  const journeys = shardOutcomes.flatMap((record) => record.flakyTests ?? []);
  const tests = [
    ...journeys.map((test) => ({ ...test, where: `${test.file}:${test.line}` })),
    ...components.map((test) => ({ ...test, where: test.file })),
  ];
  if (tests.length === 0) return [];
  // FLAKY_ISSUES is the filing step's outcome on `main`, and empty on a pull request.
  const filed =
    env.FLAKY_ISSUES === "success"
      ? "Each one has a `flaky test` issue, opened or updated by this run."
      : env.FLAKY_ISSUES === "failure"
        ? "Filing their `flaky test` issues failed; see the flaky-test issues job."
        : "On `main`, each one opens or updates a `flaky test` issue.";
  return [
    "### Passed only on retry",
    "",
    `CI retried these once and stayed green, but each failed first. ${filed} Fix the cause or delete the test; never a sleep, a longer timeout, a skip or a retry. docs/testing.md#flaky-tests.`,
    "",
    "| Test | Where | Ran on | First failure |",
    "| --- | --- | --- | --- |",
    ...tests.map(
      (test) =>
        `| ${cell(test.title)} | \`${test.where}\` | ${cell(test.project ?? "")} | ${cell(test.error ?? "")} |`,
    ),
    "",
  ];
}

/** Table cell text, with the characters that would break the row escaped. */
function cell(text) {
  return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function ciFailures(env) {
  const failures = [];

  if (env.PLAN_RESULT !== "success" || !["true", "false"].includes(env.RUN_E2E)) {
    failures.push("coverage planning");
  }
  if (env.QUALITY_RESULT !== "success") failures.push("quality checks");
  if (env.MODELS_RESULT !== "success") failures.push("flow models");
  if (env.RUN_E2E === "true" && env.BROWSER_RESULT !== "success") {
    failures.push("browser E2E");
  }
  if (env.RUN_E2E === "false" && env.BROWSER_RESULT !== "skipped") {
    failures.push("browser E2E selection");
  }

  return failures;
}

export function renderCiSummary(env, shardOutcomes = [], components = []) {
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
    `**Component coverage:** ${env.COMPONENT_COVERAGE || "Not selected"}`,
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
    `| Flow models | ${outcome(env.MODELS_RESULT)} |`,
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
    `| Passed only on retry | ${flakyCount(shardOutcomes, components)} |`,
    `| Workers-runtime tests | ${outcome(env.WORKERS_TEST_OUTCOME)} |`,
    `| Product deployment package | ${outcome(env.DEPLOY_PRODUCT_OUTCOME)} |`,
    `| Public-site deployment package | ${outcome(env.DEPLOY_SITE_OUTCOME)} |`,
    "",
    ...renderShards(env, shardOutcomes),
    ...renderFlaky(env, shardOutcomes, components),
    "A green Chromium pull-request run is not full cross-browser evidence. Chromium + WebKit journeys and every component instance run on every push to `main`; `/e2e` forces the journeys.",
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    throw new Error("GITHUB_STEP_SUMMARY is required");
  }
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    renderCiSummary(
      process.env,
      readShardOutcomes(process.env.SHARD_OUTCOMES_DIR ?? ""),
      readComponentFlaky(process.env.COMPONENT_FLAKY_DIR ?? ""),
    ),
  );

  const failures = ciFailures(process.env);
  if (failures.length > 0) {
    throw new Error(`CI failed: ${failures.join(", ")}`);
  }
}
