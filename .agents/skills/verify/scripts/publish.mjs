#!/usr/bin/env node

// Post a run's verdict and screenshots to its pull request as one comment, edited in place. See ../SKILL.md.

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const marker = "<!-- lymi-verify -->";
// A comment holds at most 65,536 characters; past this the comment keeps one screenshot a feature.
const LIMIT = 60_000;

const HELP = `Usage: node .agents/skills/verify/scripts/publish.mjs --pr <n> [options]

Posts the verdict of every feature run.mjs drove for --pr at --sha as one comment on the pull
request, with each feature's verdict.md and screenshots, and edits that comment on later runs.

  --pr <n>       Pull request the evidence belongs to, as run.mjs --pr named it
  --sha <commit> Commit the run drove (default: HEAD); it must be the pull request's head
  --out <dir>    Evidence root run.mjs wrote to (default: /mnt/project-files/evidence, else the temp dir)
  --dry-run      Print the comment instead of uploading and posting it
`;

/** Every feature folder of a run: its verdict, verdict.md and step screenshots. */
export function collect(dir, sha) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(
      (name) => name.endsWith(`-${sha.slice(0, 8)}`) && existsSync(join(dir, name, "verdict.json")),
    )
    .sort()
    .map((name) => {
      const folder = join(dir, name);
      const verdict = JSON.parse(readFileSync(join(folder, "verdict.json"), "utf8"));
      const where = name.slice(verdict.feature.length + 1, -(sha.slice(0, 8).length + 1));
      const screenshots = readdirSync(folder)
        .filter((file) => file.endsWith(".png"))
        .sort();
      return {
        ...verdict,
        where,
        folder,
        markdown: readFileSync(join(folder, "verdict.md"), "utf8"),
        screenshots,
      };
    });
}

export function failingStep(feature) {
  const index = feature.steps.findIndex((s) => !s.ok);
  return index === -1 ? null : { number: index + 1, ...feature.steps[index] };
}

/** PASS, PASS+NOTES or FAIL over every feature, as the verify skill defines them. */
export function overall(features) {
  if (features.some((f) => !f.ok)) return "FAIL";
  if (features.some((f) => f.problems.length > 0)) return "PASS+NOTES";
  return "PASS";
}

/** The name a screenshot is uploaded under, unique across the features of one run. */
export const uploadName = (feature, screenshot) =>
  `${feature.feature}-${feature.where}-${screenshot}`;

const code = (text) => `\`${text}\``;
const fence = (text) => ["```text", text.replaceAll("```", "'''").trimEnd(), "```"].join("\n");

function result(f) {
  if (!f.ok) return `**FAIL** at step ${failingStep(f).number}`;
  return f.problems.length > 0 ? "PASS with notes" : "PASS";
}

/** The screenshot a compact comment keeps: the failing step's, or the last one. */
function keyShot(f) {
  const step = failingStep(f);
  const prefix = step ? `${String(step.number).padStart(2, "0")}-` : null;
  return (prefix && f.screenshots.find((s) => s.startsWith(prefix))) ?? f.screenshots.at(-1);
}

/** The comment, with each screenshot as `./<upload name>` for pr:media to replace with its link. */
export function render({ features, sha, compact = false }) {
  const lines = [
    marker,
    `## Verify: ${overall(features)} at ${code(sha.slice(0, 8))}`,
    "",
    "| Feature | Where | Result |",
    "| --- | --- | --- |",
    ...features.map((f) => `| ${f.title} | ${f.where} | ${result(f)} |`),
  ];
  for (const f of features.filter((f) => !f.ok)) {
    const step = failingStep(f);
    lines.push(
      "",
      `**${f.title}** failed at step ${step.number}, ${step.action}:`,
      "",
      fence(step.error ?? "no error recorded"),
    );
  }
  const noted = features.filter((f) => f.ok && f.problems.length > 0);
  if (noted.length > 0) {
    lines.push("", "Console and network:");
    for (const f of noted) {
      for (const problem of f.problems.slice(0, 5))
        lines.push(`- ${f.title}: ${code(problem.replaceAll("`", "'").slice(0, 300))}`);
    }
  }
  for (const f of features) {
    const shots = compact ? [keyShot(f)].filter(Boolean) : f.screenshots;
    lines.push(
      "",
      `<details><summary>${f.title} (${f.where}): verdict.md and ${shots.length === 1 ? "1 screenshot" : `${shots.length} screenshots`}</summary>`,
      "",
      // Four backticks, so the fences verdict.md holds for each error stay intact.
      ["````markdown", f.markdown.trimEnd(), "````"].join("\n"),
      "",
      ...shots.map((s) => `![${f.title}, ${s.slice(0, -".png".length)}](./${uploadName(f, s)})`),
      "",
      "</details>",
    );
  }
  lines.push(
    "",
    `Posted by the verify skill's ${code("publish.mjs")}; the next run at a new head edits this comment.`,
  );
  return lines.join("\n");
}

/** A preview link's key must never reach a comment. */
export function leaksKey(body) {
  return /[?&]key=/.test(body);
}

function gh(args, input) {
  return execFileSync("gh", args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "inherit"],
  });
}

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

/** Edit this account's verify comment on the pull request, or create it. */
export function upsert({ repo, pr, bodyFile, api = gh }) {
  const me = api(["api", "user", "--jq", ".login"]).trim();
  const comments = JSON.parse(
    api(["api", "--paginate", "--slurp", `repos/${repo}/issues/${pr}/comments?per_page=100`]),
  ).flat();
  const mine = comments.find((c) => c.user?.login === me && c.body?.startsWith(marker));
  if (mine) {
    api([
      "api",
      "-X",
      "PATCH",
      `repos/${repo}/issues/comments/${mine.id}`,
      "-F",
      `body=@${bodyFile}`,
    ]);
    return { action: "edited", url: mine.html_url };
  }
  const made = JSON.parse(
    api(["api", `repos/${repo}/issues/${pr}/comments`, "-F", `body=@${bodyFile}`]),
  );
  return { action: "created", url: made.html_url };
}

function defaultRoot() {
  return existsSync("/mnt/project-files")
    ? "/mnt/project-files/evidence"
    : join(tmpdir(), "lymi-evidence");
}

function main() {
  const { values } = parseArgs({
    options: {
      pr: { type: "string" },
      sha: { type: "string" },
      out: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || !values.pr) {
    process.stdout.write(HELP);
    process.exitCode = values.help ? 0 : 1;
    return;
  }
  const sha = values.sha ?? git(["rev-parse", "HEAD"]);
  const features = collect(join(values.out ?? defaultRoot(), `pr-${values.pr}`), sha);
  if (features.length === 0) {
    throw new Error(
      `No evidence for pull request ${values.pr} at ${sha.slice(0, 8)}; drive it with run.mjs --pr ${values.pr} first`,
    );
  }
  let body = render({ features, sha });
  if (body.length > LIMIT) body = render({ features, sha, compact: true });
  if (leaksKey(body)) throw new Error("The comment would carry a preview key; nothing was posted");
  if (values["dry-run"]) {
    process.stdout.write(`${body}\n`);
    return;
  }

  const repo = gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).trim();
  const head = gh(["pr", "view", values.pr, "--json", "headRefOid", "--jq", ".headRefOid"]).trim();
  if (head !== sha) {
    throw new Error(
      `The evidence is for ${sha.slice(0, 8)}, but the pull request's head is ${head.slice(0, 8)}; drive the head and publish again`,
    );
  }
  const staging = mkdtempSync(join(tmpdir(), "lymi-verify-publish-"));
  try {
    const bodyFile = join(staging, "comment.md");
    writeFileSync(bodyFile, body);
    const shots = [...body.matchAll(/\]\(\.\/([^)]+\.png)\)/g)].map((m) => m[1]);
    for (const f of features) {
      for (const s of f.screenshots) {
        const name = uploadName(f, s);
        if (shots.includes(name)) copyFileSync(join(f.folder, s), join(staging, name));
      }
    }
    // pr:media pushes the screenshots to the shared pr-media branch and rewrites each ./name to its pinned link.
    execFileSync(
      process.execPath,
      [
        join(repoRoot, "scripts/pr-media.mjs"),
        "--body",
        bodyFile,
        ...shots.map((s) => join(staging, s)),
      ],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
    const { action, url } = upsert({ repo, pr: values.pr, bodyFile });
    process.stdout.write(`Verify comment ${action}: ${url}\n`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
