#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function shardOutcome({ shard, shards, outcome, setupOutcome, report }) {
  const stats = report?.stats;
  const failures = (report?.suites ?? []).flatMap((suite) => collectFailures(suite, []));
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
}
