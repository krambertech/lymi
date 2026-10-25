#!/usr/bin/env node

// Drive every verify feature on `main` and keep one issue per feature that fails, and one for a night
// that could not start. The verify skill owns the rules.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { failingStep } from "../.agents/skills/verify/scripts/publish.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skill = resolve(root, ".agents/skills/verify");
export const label = "verify: nightly";
const featureMarker = (feature) => `<!-- verify-nightly feature=${feature} -->`;
const setupMarker = "<!-- verify-nightly setup -->";
const stepMarker = /<!-- verify-nightly step=(.*?) -->/;

const HELP = `Usage: node scripts/verify-nightly.mjs <drive|report> [options]

  drive [feature...]  Run every feature (or those named) with run.mjs, retry each failure once,
                      and write <out>/verdict.json. Takes --url, --sha and --out.
  report              Open, edit and close the nightly issues from --verdict and the step outcomes
                      in INSTALL_OUTCOME, BROWSER_OUTCOME, SERVER_OUTCOME and DRIVE_OUTCOME.
`;

const code = (text) => `\`${text}\``;
const fence = (text) => ["```text", text.replaceAll("```", "'''"), "```"].join("\n");

function verdicts(out, base) {
  if (!existsSync(out)) return {};
  return Object.fromEntries(
    readdirSync(out, { recursive: true })
      .filter((file) => file.endsWith("verdict.json") && !file.startsWith("retry"))
      .map((file) => {
        const verdict = JSON.parse(readFileSync(join(out, file), "utf8"));
        return [
          verdict.feature,
          { ...verdict, evidence: relative(base, dirname(join(out, file))) },
        ];
      }),
  );
}

function runFeatures(features, { url, sha }, out, base) {
  const run = spawnSync(
    process.execPath,
    [join(skill, "scripts/run.mjs"), ...features, "--url", url, "--sha", sha, "--out", out],
    { cwd: root, stdio: "inherit" },
  );
  const found = verdicts(out, base);
  // A feature the runner never reached, such as after a browser that would not launch, failed to set up.
  for (const feature of features) {
    found[feature] ??= {
      feature,
      title: feature,
      ok: false,
      steps: [
        {
          action: "set up",
          ok: false,
          error: `run.mjs exited with ${run.status ?? run.signal} before driving it`,
        },
      ],
      problems: [],
    };
  }
  return found;
}

/** The second attempt decides a feature that failed its first; load-related timeouts cause most one-off failures. */
export function settle(features, first, second) {
  return features.map((feature) =>
    second[feature] ? { ...second[feature], retried: true } : first[feature],
  );
}

function drive(named, values) {
  const features =
    named.length > 0
      ? named
      : readdirSync(join(skill, "features"))
          .filter((file) => file.endsWith(".mjs"))
          .map((file) => file.slice(0, -".mjs".length))
          .sort();
  mkdirSync(values.out, { recursive: true });
  const first = runFeatures(features, values, values.out, values.out);
  const failed = features.filter((feature) => !first[feature].ok);
  const second =
    failed.length > 0 ? runFeatures(failed, values, join(values.out, "retry"), values.out) : {};
  const results = settle(features, first, second);
  writeFileSync(
    join(values.out, "verdict.json"),
    `${JSON.stringify({ sha: values.sha, features: results }, null, 2)}\n`,
  );
  const failing = results.filter((f) => !f.ok).map((f) => f.feature);
  process.stdout.write(
    failing.length > 0
      ? `${failing.length} of ${results.length} features fail twice: ${failing.join(", ")}\n`
      : `All ${results.length} features pass.\n`,
  );
}

/** Why the night judged no recipe: a step that did not succeed, or every feature failing to set up. */
export function setupFailure(outcomes, results = []) {
  const failed = outcomes.find(([, outcome]) => outcome !== "success");
  if (failed) return { step: failed[0], outcome: failed[1] };
  // The doctor or the sign-in failing everywhere is the server, not every recipe at once.
  if (results.length > 1 && results.every((f) => failingStep(f)?.action === "set up")) {
    return {
      step: "Drive every feature",
      outcome: `set-up failures in all ${results.length} features`,
    };
  }
  return null;
}

export function featureIssue(f, { sha, runUrl, artifactUrl, artifactName }) {
  const step = failingStep(f);
  const signature = `${step.number} ${step.action}`;
  return {
    title: `Nightly verify: ${f.title} fails on main`,
    signature,
    body: [
      featureMarker(f.feature),
      `<!-- verify-nightly step=${signature} -->`,
      `The \`${f.feature}\` verify recipe fails on \`main\` at ${code(sha.slice(0, 8))}, on its first attempt and on a retry.`,
      "",
      `**Step ${step.number}:** ${step.action}`,
      "",
      fence(step.error ?? "no error recorded"),
      "",
      `Evidence: ${artifactUrl ? `[${artifactName}](${artifactUrl})` : code(artifactName)}, folder ${code(f.evidence)}, from [the run](${runUrl}). Its \`verdict.md\` lists every step, and each step has a screenshot, an ARIA snapshot and the stored state.`,
      "",
      `Reproduce it locally with \`node .agents/skills/verify/scripts/run.mjs ${f.feature}\` against \`server.mjs start\` on \`main\`. The nightly run updates this issue while the recipe fails and closes it when it passes again.`,
    ].join("\n"),
  };
}

export function setupIssue(failure, { sha, runUrl }) {
  return {
    title: "Nightly verify could not start",
    body: [
      setupMarker,
      `The nightly verify run on \`main\` at ${code(sha.slice(0, 8))} stopped at **${failure.step}**, which ended as ${failure.outcome}.`,
      "",
      `[Open the run](${runUrl}) for the log; the product server's own log is in its \`verify-nightly-server-log\` artifact when the server step failed. No recipe was judged, so the feature issues are unchanged. The next run that starts closes this issue.`,
    ].join("\n"),
  };
}

/** Every change to make to the issues, from tonight's results and the issues already open. */
export function plan({ open, results, failure, context }) {
  const actions = [];
  const setup = open.find((issue) => issue.body?.startsWith(setupMarker));
  if (failure) {
    const issue = setupIssue(failure, context);
    actions.push(
      setup ? { kind: "edit", number: setup.number, ...issue } : { kind: "open", ...issue },
    );
    return actions;
  }
  if (setup) {
    actions.push({
      kind: "close",
      number: setup.number,
      comment: `The nightly run started again at ${code(context.sha.slice(0, 8))} ([run](${context.runUrl})).`,
    });
  }
  for (const f of results) {
    const existing = open.find((issue) => issue.body?.startsWith(featureMarker(f.feature)));
    if (f.ok) {
      if (existing) {
        actions.push({
          kind: "close",
          number: existing.number,
          comment: `\`${f.feature}\` passes again on \`main\` at ${code(context.sha.slice(0, 8))} ([run](${context.runUrl})).`,
        });
      }
      continue;
    }
    const issue = featureIssue(f, context);
    if (!existing) {
      actions.push({ kind: "open", title: issue.title, body: issue.body });
      continue;
    }
    const before = existing.body.match(stepMarker)?.[1];
    actions.push({
      kind: "edit",
      number: existing.number,
      title: issue.title,
      body: issue.body,
      // A night that fails the same way only refreshes the body; a new failing step is worth a notification.
      comment:
        before === issue.signature
          ? null
          : `Now fails at step ${issue.signature} at ${code(context.sha.slice(0, 8))} ([run](${context.runUrl})).`,
    });
  }
  return actions;
}

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!response.ok)
    throw new Error(`GitHub ${init.method ?? "GET"} ${path} answered HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function ensureLabel(repo, api) {
  try {
    await api(`/repos/${repo}/labels/${encodeURIComponent(label)}`);
  } catch {
    await api(`/repos/${repo}/labels`, {
      method: "POST",
      body: JSON.stringify({
        name: label,
        color: "c5def5",
        description: "A verify recipe failing on main, kept by the nightly run",
      }),
    });
  }
}

async function openIssues(repo, api) {
  const issues = [];
  for (let page = 1; ; page += 1) {
    const batch = await api(
      `/repos/${repo}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=100&page=${page}`,
    );
    issues.push(...batch.filter((issue) => !issue.pull_request));
    if (batch.length < 100) return issues;
  }
}

export async function apply(repo, actions, api = github) {
  for (const action of actions) {
    if (action.kind === "open") {
      const made = await api(`/repos/${repo}/issues`, {
        method: "POST",
        body: JSON.stringify({ title: action.title, body: action.body, labels: [label] }),
      });
      process.stdout.write(`Opened #${made.number}: ${action.title}\n`);
    } else if (action.kind === "edit") {
      await api(`/repos/${repo}/issues/${action.number}`, {
        method: "PATCH",
        body: JSON.stringify({ title: action.title, body: action.body }),
      });
      if (action.comment) {
        await api(`/repos/${repo}/issues/${action.number}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: action.comment }),
        });
      }
      process.stdout.write(`Updated #${action.number}: ${action.title}\n`);
    } else if (action.kind === "close") {
      await api(`/repos/${repo}/issues/${action.number}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: action.comment }),
      });
      await api(`/repos/${repo}/issues/${action.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed", state_reason: "completed" }),
      });
      process.stdout.write(`Closed #${action.number}\n`);
    }
  }
}

async function report(values) {
  const env = process.env;
  const repo = env.GITHUB_REPOSITORY;
  const context = {
    sha: env.GITHUB_SHA,
    runUrl: `${env.GITHUB_SERVER_URL}/${repo}/actions/runs/${env.GITHUB_RUN_ID}`,
    artifactUrl: values["artifact-url"] || null,
    artifactName: values["artifact-name"],
  };
  const verdict =
    values.verdict && existsSync(values.verdict)
      ? JSON.parse(readFileSync(values.verdict, "utf8"))
      : null;
  const failure =
    setupFailure(
      [
        ["Install dependencies", env.INSTALL_OUTCOME],
        ["Install Chromium", env.BROWSER_OUTCOME],
        ["Start the product", env.SERVER_OUTCOME],
        ["Drive every feature", env.DRIVE_OUTCOME],
      ],
      verdict?.features,
    ) ?? (verdict ? null : { step: "Drive every feature", outcome: "success without a verdict" });
  await ensureLabel(repo, github);
  const actions = plan({
    open: await openIssues(repo, github),
    results: verdict?.features ?? [],
    failure,
    context,
  });
  await apply(repo, actions);
  if (actions.length === 0) process.stdout.write("No issue to open, update or close.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      url: { type: "string" },
      sha: { type: "string" },
      out: { type: "string" },
      verdict: { type: "string" },
      "artifact-url": { type: "string" },
      "artifact-name": { type: "string" },
    },
  });
  const [command, ...features] = positionals;
  if (command === "drive") drive(features, values);
  else if (command === "report") await report(values);
  else process.stdout.write(HELP);
}
