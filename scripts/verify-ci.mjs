#!/usr/bin/env node

// Drive verify features headless in CI and report them on the pull request. The verify skill owns the rules.

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runner = resolve(root, ".agents/skills/verify/scripts/run.mjs");
export const marker = "<!-- lymi-verify -->";

const HELP = `Usage: node scripts/verify-ci.mjs <preview|drive|comment> [options]

  preview   Find the app preview link for --sha, mask its key, write it to --entry-file
  drive     Run features with run.mjs, retry each failure once, and write <out>/verdict.json
  comment   Create or edit the pull request's one verify comment for --phase
`;

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function summary(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
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

/** The newest successful app-preview deployment's link for a commit; the link carries the preview key. */
export async function previewEntry({ repo, sha, api = github, attempts = 6, delayMs = 10_000 }) {
  for (let attempt = 1; ; attempt += 1) {
    const deployments = await api(
      `/repos/${repo}/deployments?environment=app-preview&sha=${sha}&per_page=10`,
    );
    for (const deployment of deployments) {
      const statuses = await api(
        `/repos/${repo}/deployments/${deployment.id}/statuses?per_page=10`,
      );
      const done = statuses.find((s) => s.state === "success" && s.environment_url);
      if (done) return new URL(done.environment_url);
    }
    if (attempt === attempts) throw new Error(`no successful app-preview deployment for ${sha}`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function previewCommand(values) {
  const entry = await previewEntry({ repo: process.env.GITHUB_REPOSITORY, sha: values.sha });
  const key = entry.searchParams.get("key");
  if (!key) throw new Error("the app-preview deployment link carries no key");
  // Registered before anything else is printed, so the key reads *** in every later line of this job.
  process.stdout.write(`::add-mask::${key}\n`);
  writeFileSync(values["entry-file"], entry.href, { mode: 0o600 });
  output("origin", entry.origin);
  process.stdout.write(`App preview for ${values.sha.slice(0, 8)}: ${entry.origin}\n`);
}

function verdictFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith("verdict.json"))
    .map((file) => join(dir, file));
}

function drive(features, values, out) {
  const args = [runner, ...features, "--url", values.url, "--sha", values.sha, "--out", out];
  if (values.entry) args.push("--entry", values.entry);
  if (values.version) args.push("--version", values.version);
  if (values.pr) args.push("--pr", values.pr);
  const run = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  const verdicts = Object.fromEntries(
    verdictFiles(out)
      .filter((file) => !relative(out, file).startsWith("retry"))
      .map((file) => {
        const verdict = JSON.parse(readFileSync(file, "utf8"));
        return [verdict.feature, { ...verdict, evidence: relative(values.out, dirname(file)) }];
      }),
  );
  // A feature the runner never reached, such as after a browser that would not launch, failed to set up.
  for (const feature of features) {
    verdicts[feature] ??= {
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
  return verdicts;
}

/** The first failing step of a feature, as the verdict and the nightly issue name it. */
export function failingStep(verdict) {
  const index = verdict.steps.findIndex((s) => !s.ok);
  if (index === -1) return null;
  return { number: index + 1, ...verdict.steps[index] };
}

/** PASS, PASS+NOTES or FAIL over every feature, as the verify skill defines them. */
export function overall(features) {
  if (features.some((f) => !f.ok)) return "FAIL";
  if (features.some((f) => f.problems.length > 0 || f.retried)) return "PASS+NOTES";
  return "PASS";
}

function scrub(dir, secret) {
  if (!secret) return [];
  return readdirSync(dir, { recursive: true })
    .map((file) => join(dir, file))
    .filter((file) => /\.(md|json|yml)$/.test(file) && readFileSync(file, "utf8").includes(secret));
}

/** Leave the persona the preview link opens freshly seeded for whoever opens it next. */
async function reseedLearner(entry) {
  const opened = await fetch(entry, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
  const cookie = opened.headers
    .getSetCookie()
    .map((header) => header.split(";", 1)[0])
    .join("; ");
  const signIn = new URL("/api/dev/sign-in?as=learner&reset=1&returnTo=%2Ftoday", entry);
  const reset = await fetch(signIn, {
    redirect: "manual",
    headers: { cookie },
    signal: AbortSignal.timeout(300_000),
  });
  if (reset.status >= 400) throw new Error(`the learner reset answered HTTP ${reset.status}`);
}

async function driveCommand(features, values) {
  const entry = values["entry-file"]
    ? readFileSync(values["entry-file"], "utf8").trim()
    : undefined;
  const options = { ...values, entry };
  const first = drive(features, options, values.out);
  const failed = features.filter((f) => !first[f].ok);
  // Load-related timeouts cause most one-off failures, so a failure counts only when it repeats.
  const second = failed.length > 0 ? drive(failed, options, join(values.out, "retry")) : {};
  const results = features.map((feature) => {
    const again = second[feature];
    if (!again) return first[feature];
    return {
      ...again,
      retried: true,
      firstAttempt: { steps: first[feature].steps, evidence: first[feature].evidence },
    };
  });

  const key = entry ? new URL(entry).searchParams.get("key") : null;
  const leaks = scrub(values.out, key);
  const verdict = {
    verdict: overall(results),
    sha: values.sha,
    version: values.version ?? null,
    reason: values.reason ?? null,
    features: results,
    evidenceClean: leaks.length === 0,
  };
  writeFileSync(join(values.out, "verdict.json"), `${JSON.stringify(verdict, null, 2)}\n`);
  output("verdict", verdict.verdict);
  output("evidence_clean", String(verdict.evidenceClean));
  if (leaks.length > 0) {
    process.stdout.write(
      `::error::The preview key appears in ${leaks.length} evidence file(s); the evidence is not uploaded.\n`,
    );
  }
  if (entry) {
    try {
      await reseedLearner(entry);
      process.stdout.write("Reseeded learner, the persona the preview link opens.\n");
    } catch (error) {
      process.stdout.write(`::warning::Could not reseed learner after the run: ${error.message}\n`);
    }
  }
  summary(render({ phase: "final", verdict, artifactUrl: null, runUrl: null }));
  process.stdout.write(`Verify verdict: ${verdict.verdict}\n`);
}

const code = (text) => `\`${text}\``;
const count = (n) => `${n} ${n === 1 ? "feature" : "features"}`;

function fence(text) {
  return ["```text", text.replaceAll("```", "'''"), "```"].join("\n");
}

function featureRow(f) {
  const step = failingStep(f);
  const result = f.ok
    ? f.retried
      ? "PASS on retry"
      : f.problems.length > 0
        ? "PASS with notes"
        : "PASS"
    : `**FAIL** at step ${step.number}`;
  return `| ${f.title} | ${result} |`;
}

/** The comment body, which is also the job summary. */
export function render({ phase, verdict, features = [], reason, sha, artifactUrl, runUrl }) {
  const head = sha ?? verdict?.sha;
  const at = code(head.slice(0, 8));
  if (phase === "running") {
    return [
      marker,
      `## Verify: running at ${at}`,
      "",
      `Driving ${features.join(", ")} on this pull request's app preview. The run resets the preview's personas, so wait for the verdict here before trying the preview by hand.`,
      "",
      runUrl ? `[Follow the run](${runUrl})` : "",
    ].join("\n");
  }
  if (phase === "skipped") {
    return [marker, `## Verify: no run at ${at}`, "", reason].join("\n");
  }
  if (phase === "undriven") {
    return [
      marker,
      `## Verify: not driven at ${at}`,
      "",
      `Nothing was driven: ${reason}`,
      "",
      runUrl ? `[Open the run](${runUrl})` : "",
    ].join("\n");
  }

  const lines = [
    marker,
    `## Verify: ${verdict.verdict} at ${at}`,
    "",
    `Drove ${count(verdict.features.length)} on this pull request's app preview${verdict.version ? `, Worker version ${code(verdict.version.slice(0, 8))}` : ""}. ${verdict.reason ?? ""}`.trim(),
    "",
    "| Feature | Result |",
    "| --- | --- |",
    ...verdict.features.map(featureRow),
  ];
  for (const f of verdict.features.filter((f) => !f.ok)) {
    const step = failingStep(f);
    lines.push(
      "",
      `**${f.title}** failed at step ${step.number}, ${step.action}${f.retried ? ", on both attempts" : ""}:`,
      "",
      fence(step.error ?? "no error recorded"),
      ...(f.evidence ? ["", `Its files are in ${code(f.evidence)} in the evidence.`] : []),
    );
  }
  const notes = verdict.features.filter((f) => f.ok && (f.retried || f.problems.length > 0));
  if (notes.length > 0) {
    lines.push("", "Notes:");
    for (const f of notes) {
      if (f.retried)
        lines.push(
          `- ${f.title} failed its first attempt at step ${failingStep(f.firstAttempt).number} and passed on retry.`,
        );
      for (const problem of f.problems.slice(0, 5))
        lines.push(`- ${f.title}: ${code(problem.replaceAll("`", "'").slice(0, 300))}`);
    }
  }
  lines.push("");
  if (!verdict.evidenceClean) {
    lines.push("The evidence was withheld because a file in it held the preview key.");
  } else if (artifactUrl) {
    lines.push(
      `Evidence: [screenshots, ARIA snapshots, stored state and ${code("verdict.md")} for each feature](${artifactUrl})${runUrl ? ` from [the run](${runUrl})` : ""}.`,
    );
  }
  return lines.join("\n");
}

async function upsertComment({ repo, pr, body, create = true, api = github }) {
  let existing = null;
  for (let page = 1; !existing; page += 1) {
    const comments = await api(`/repos/${repo}/issues/${pr}/comments?per_page=100&page=${page}`);
    existing = comments.find((c) => c.user?.type === "Bot" && c.body?.startsWith(marker)) ?? null;
    if (comments.length < 100) break;
  }
  if (existing) {
    await api(`/repos/${repo}/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    return { action: "edited", id: existing.id };
  }
  if (!create) return { action: "none" };
  const made = await api(`/repos/${repo}/issues/${pr}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return { action: "created", id: made.id };
}

export { upsertComment };

/** What the comment should say, from the plan and how CI's preview and verify jobs ended. */
export function commentPhase({ features, draft, previewResult, verifyResult, hasVerdict }) {
  if (features.length === 0) return { phase: "skipped" };
  if (draft) {
    return {
      phase: "skipped",
      reason: "A draft gets no app preview; marking it ready for review drives it.",
    };
  }
  if (previewResult !== "success") {
    return { phase: "undriven", reason: `the app preview job ended as ${previewResult}.` };
  }
  if (hasVerdict) return { phase: "final" };
  return {
    phase: "undriven",
    reason: `the verify job ended as ${verifyResult} before writing a verdict.`,
  };
}

async function commentCommand(values) {
  const env = process.env;
  const runUrl = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
  const features = (values.features ?? "").split(" ").filter(Boolean);
  const hasVerdict = Boolean(values.verdict && existsSync(values.verdict));
  const decided = values.phase
    ? { phase: values.phase }
    : commentPhase({
        features,
        draft: env.DRAFT === "true",
        previewResult: env.PREVIEW_RESULT,
        verifyResult: env.VERIFY_RESULT,
        hasVerdict,
      });
  const body = render({
    phase: decided.phase,
    verdict: decided.phase === "final" ? JSON.parse(readFileSync(values.verdict, "utf8")) : null,
    features,
    reason: decided.reason ?? values.reason,
    sha: values.sha,
    artifactUrl: values["artifact-url"],
    runUrl,
  });
  // A pull request that never had a verdict gets none for reaching nothing; one that had one learns why it is gone.
  const result = await upsertComment({
    repo: env.GITHUB_REPOSITORY,
    pr: values.pr,
    body,
    create: decided.phase !== "skipped",
  });
  summary(body);
  process.stdout.write(`Verify comment ${result.action}: ${decided.phase}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      sha: { type: "string" },
      url: { type: "string" },
      version: { type: "string" },
      pr: { type: "string" },
      out: { type: "string" },
      reason: { type: "string" },
      features: { type: "string" },
      phase: { type: "string" },
      verdict: { type: "string" },
      "entry-file": { type: "string" },
      "artifact-url": { type: "string" },
    },
  });
  const [command, ...features] = positionals;
  if (command === "preview") await previewCommand(values);
  else if (command === "drive") await driveCommand(features, values);
  else if (command === "comment") await commentCommand(values);
  else process.stdout.write(HELP);
}
