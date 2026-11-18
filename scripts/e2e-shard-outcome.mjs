#!/usr/bin/env node

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

// A red gate should name the tests, not just the shard, and a whole shard's failures would bury
// the summary the rest of CI writes into.
const maxReportedFailures = 20;

function collectFailures(suite, failures) {
  for (const spec of suite.specs ?? []) {
    if (spec.ok === false) failures.push(`${spec.file}:${spec.line} — ${spec.title}`);
  }
  for (const child of suite.suites ?? []) collectFailures(child, failures);
  return failures;
}

const colour = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** An error's first two lines, such as the failed matcher and its locator, without Playwright's colour codes. */
function errorSummary(message) {
  const lines = (message ?? "")
    .replace(colour, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(0, 2).join(" ").slice(0, 300) || undefined;
}

/** Tests that failed and then passed on CI's retry: green, but flaky. docs/testing.md#flaky-tests. */
function collectFlaky(suite, flaky, parents = []) {
  const path = suite.title && !suite.title.endsWith(".ts") ? [...parents, suite.title] : parents;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      if (test.status !== "flaky") continue;
      const failed = (test.results ?? []).find((result) => result.status !== "passed");
      flaky.push({
        // Playwright's paths start at `testDir`; the issue and the summary name the file from the root.
        file: `e2e/${spec.file}`,
        line: spec.line,
        title: [...path, spec.title].join(" › "),
        project: test.projectName,
        error: errorSummary(failed?.error?.message),
      });
    }
  }
  for (const child of suite.suites ?? []) collectFlaky(child, flaky, path);
  return flaky;
}

export function shardOutcome({ shard, shards, outcome, setupOutcome, report }) {
  const stats = report?.stats;
  const failures = (report?.suites ?? []).flatMap((suite) => collectFailures(suite, []));
  const flakyTests = (report?.suites ?? []).flatMap((suite) => collectFlaky(suite, []));
  // A shard whose setup broke never reached a test, and reporting that as "skipped" would read
  // as a deliberate exclusion rather than a red gate.
  const setupFailed = Boolean(setupOutcome) && setupOutcome !== "success";

  return {
    shard: Number(shard),
    shards: Number(shards),
    outcome: setupFailed ? "failure" : outcome || "unknown",
    reported: Boolean(stats),
    passed: stats?.expected ?? 0,
    failed: stats?.unexpected ?? 0,
    flaky: stats?.flaky ?? 0,
    skipped: stats?.skipped ?? 0,
    failures: failures.slice(0, maxReportedFailures),
    truncatedFailures: Math.max(0, failures.length - maxReportedFailures),
    flakyTests,
  };
}

function readReport(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [reportPath, outputPath] = process.argv.slice(2);
  if (!reportPath || !outputPath) {
    throw new Error("Usage: e2e-shard-outcome.mjs <playwright-json-report> <output-file>");
  }

  const record = shardOutcome({
    shard: process.env.SHARD,
    shards: process.env.SHARDS,
    outcome: process.env.E2E_OUTCOME,
    setupOutcome: process.env.SETUP_OUTCOME,
    report: readReport(reportPath),
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(
    `Shard ${record.shard} of ${record.shards}: ${record.outcome}; ${record.passed} passed, ${record.failed} failed, ${record.flaky} flaky, ${record.skipped} skipped.\n`,
  );
  // The workflow keeps the failed attempt's screenshot and error context when a test passed only on retry.
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `flaky=${record.flaky}\n`);
}
