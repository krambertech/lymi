#!/usr/bin/env node

// Opens one GitHub issue per test that passed only on CI's retry, or adds this run to the issue
// already open for it, so a flaky pass is never silent. docs/testing.md#flaky-tests.
// Usage: node scripts/flaky-issues.mjs [--phone]. Runs on pushes to `main`; needs GH_TOKEN with issues: write.

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { readComponentFlaky, readShardOutcomes } from "./ci-summary.mjs";

export const LABEL = "flaky test";
const LABELS = [LABEL, "type: bug", "goal: quality"];

/** The tests a run reported as passing only on retry, one entry per test whatever its browsers. */
export function flakyTests({ shardOutcomes = [], components = [], phone = [] }) {
  const tests = new Map();
  const add = (kind, test) => {
    const key = `${test.file} › ${test.title}`;
    const entry = tests.get(key) ?? { key, kind, file: test.file, title: test.title, seen: [] };
    entry.seen.push({ project: test.project, error: test.error });
    tests.set(key, entry);
  };
  for (const record of shardOutcomes)
    for (const test of record.flakyTests ?? []) add("journey", test);
  for (const test of components) add("component", test);
  for (const test of phone) add("phone", test);
  return [...tests.values()];
}

const marker = (key) => `<!-- flaky-test: ${key} -->`;

function occurrence(test, run) {
  const where = test.seen
    .map(
      (seen) =>
        `- \`${seen.project ?? "?"}\`: ${seen.error ? `\`${seen.error.replaceAll("`", "'")}\`` : "no error recorded"}`,
    )
    .join("\n");
  return `[Run ${run.id}](${run.url}) on \`${run.sha.slice(0, 9)}\` failed it first and passed it on retry.\n\n${where}`;
}

export function issueTitle(test) {
  const title = `Flaky test: ${test.title}`;
  return title.length > 200 ? `${title.slice(0, 197)}…` : title;
}

export function issueBody(test, run) {
  return [
    marker(test.key),
    `\`${test.file}\` › ${test.title}`,
    "",
    occurrence(test, run),
    "",
    "CI retries a failed test once and stays green, so this failure would otherwise pass unseen. Find the cause in the failed attempt: the run summary names it, and a journey's `e2e-diagnostics-shard-<n>` artifact keeps its screenshot and `error-context.md` for seven days.",
    "",
    `Fix the cause, or delete the test and say here what coverage went with it. Never a sleep, a longer timeout, a skip or a retry: [docs/testing.md](${run.repoUrl}/blob/main/docs/testing.md#flaky-tests). This issue gets a comment each time the test flakes on \`main\`, and reopens if it flakes after it was closed.`,
  ].join("\n");
}

/** What to do for each flaky test, given every issue that has carried the label. */
export function plan(tests, issues) {
  return tests.map((test) => {
    const mine = issues.filter((issue) => issue.body?.includes(marker(test.key)));
    // An open issue takes the occurrence; otherwise the newest closed one reopens, unless it was
    // closed as not planned, which keeps the record without asking for the work again.
    const found =
      mine.find((issue) => issue.state === "open") ?? mine.sort((a, b) => b.number - a.number)[0];
    if (!found) return { action: "create", test };
    if (found.state === "open" || found.state_reason === "not_planned") {
      return { action: "comment", test, number: found.number };
    }
    return { action: "reopen", test, number: found.number };
  });
}

function gh(args, input) {
  return execFileSync("gh", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {
    GITHUB_REPOSITORY: repo,
    GITHUB_SERVER_URL: server,
    GITHUB_RUN_ID: id,
    GITHUB_SHA,
  } = process.env;
  // A called workflow tests the commit its caller names, which GITHUB_SHA does not follow.
  const sha = process.env.FLAKY_SHA || GITHUB_SHA;
  if (!repo || !id || !sha)
    throw new Error("GITHUB_REPOSITORY, GITHUB_RUN_ID and GITHUB_SHA are required");
  const repoUrl = `${server ?? "https://github.com"}/${repo}`;
  const run = { id, sha, repoUrl, url: `${repoUrl}/actions/runs/${id}` };

  const tests = flakyTests(
    process.argv.includes("--phone")
      ? {
          phone: [
            {
              file: "apps/mobile/e2e/flows/sign-in-and-review.yaml",
              title: "the phone's smoke journey signs in and reviews",
              project: "iOS Simulator",
              error: process.env.PHONE_ERROR,
            },
          ],
        }
      : {
          shardOutcomes: readShardOutcomes(process.env.SHARD_OUTCOMES_DIR ?? ""),
          components: readComponentFlaky(process.env.COMPONENT_FLAKY_DIR ?? ""),
        },
  );
  if (tests.length === 0) process.exit(0);

  try {
    gh([
      "label",
      "create",
      LABEL,
      "--repo",
      repo,
      "--color",
      "d93f0b",
      "--description",
      "Passed only on CI's retry; fix the cause or delete it",
    ]);
  } catch {
    // It exists already.
  }
  const issues = JSON.parse(
    gh([
      "api",
      "--paginate",
      "--slurp",
      `repos/${repo}/issues?labels=${encodeURIComponent(LABEL)}&state=all&per_page=100`,
    ]),
  ).flat();

  for (const step of plan(tests, issues)) {
    if (step.action === "create") {
      const body = JSON.stringify({
        title: issueTitle(step.test),
        body: issueBody(step.test, run),
        labels: LABELS,
      });
      const created = JSON.parse(gh(["api", `repos/${repo}/issues`, "--input", "-"], body));
      process.stdout.write(`Opened #${created.number} for ${step.test.key}\n`);
      continue;
    }
    if (step.action === "reopen") {
      gh(
        ["api", "-X", "PATCH", `repos/${repo}/issues/${step.number}`, "--input", "-"],
        JSON.stringify({ state: "open" }),
      );
    }
    const comment = `${step.action === "reopen" ? "Flaked again after this was closed. " : ""}${occurrence(step.test, run)}`;
    gh(
      ["api", `repos/${repo}/issues/${step.number}/comments`, "--input", "-"],
      JSON.stringify({ body: comment }),
    );
    process.stdout.write(
      `${step.action === "reopen" ? "Reopened" : "Updated"} #${step.number} for ${step.test.key}\n`,
    );
  }
}
