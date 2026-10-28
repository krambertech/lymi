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
import { mediaFolder, mediaUrl, parseRepository } from "../../../../scripts/pr-media.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const marker = "<!-- lymi-verify -->";
// A comment holds at most 65,536 characters, counted after pr:media turns each ./name into a full link.
export const LIMIT = 65_536;

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
function fence(text) {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map(([run]) => run.length));
  const delimiter = "`".repeat(longest + 1);
  return [`${delimiter}text`, text.trimEnd(), delimiter].join("\n");
}

function result(f) {
  if (!f.ok) return `**FAIL** at step ${failingStep(f).number}`;
  return f.problems.length > 0 ? "PASS with notes" : "PASS";
}

function location(feature) {
  const phone = feature.where.endsWith("-phone");
  const instance = phone ? feature.where.slice(0, -6) : feature.where;
  return `${instance === "local" ? "Local" : "Preview"} · ${phone ? "mobile web" : "desktop web"}`;
}

const html = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

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
    "| Feature | Tested on | Result |",
    "| --- | --- | --- |",
    ...features.map((f) => `| ${f.title} | ${location(f)} | ${result(f)} |`),
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
      `<details><summary>${html(f.title)} (${html(location(f))}): steps and ${shots.length === 1 ? "1 screenshot" : `${shots.length} screenshots`}</summary>`,
      "",
      ...f.steps.map((step, i) => `${i + 1}. **${step.ok ? "PASS" : "FAIL"}** ${step.action}`),
      "",
      ...shots.map((s) => `![${f.title}, ${s.slice(0, -".png".length)}](./${uploadName(f, s)})`),
      "",
      "<details><summary>Full run log</summary>",
      "",
      fence(f.markdown),
      "",
      "</details>",
      "",
      "</details>",
    );
  }
  lines.push("", "This is the author's verification run. A later run updates this comment.");
  return lines.join("\n");
}

/** The body's length once pr:media has replaced each `./name` with its commit-pinned link. */
export function postedLength(body, { repo, folder }) {
  const commit = "0".repeat(40);
  return body.replace(
    /\]\(\.\/([^)]+\.png)\)/g,
    (_, name) => `](${mediaUrl(repo, commit, `${folder}/${name}`)})`,
  ).length;
}

/** The full comment when it fits once posted, else one screenshot a feature. */
export function fitComment({ features, sha, repo, folder }) {
  for (const compact of [false, true]) {
    const body = render({ features, sha, compact });
    if (postedLength(body, { repo, folder }) <= LIMIT) return body;
  }
  throw new Error(
    `${features.length} features are too many for one comment; publish fewer at a time`,
  );
}

/** The full commit a run is published for, so a short --sha still matches the pull request's head. */
export function resolveSha(
  value,
  rev = (ref) => git(["rev-parse", "--verify", `${ref}^{commit}`]),
) {
  return rev(value ?? "HEAD");
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

export function publish({ repo, pr, bodyFile, screenshots, upload = execFileSync, api = gh }) {
  if (screenshots.length > 0) {
    upload(
      process.execPath,
      [join(repoRoot, "scripts/pr-media.mjs"), "--body", bodyFile, ...screenshots],
      { cwd: repoRoot, stdio: "inherit" },
    );
  }
  return upsert({ repo, pr, bodyFile, api });
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
  const sha = resolveSha(values.sha);
  const features = collect(join(values.out ?? defaultRoot(), `pr-${values.pr}`), sha);
  if (features.length === 0) {
    throw new Error(
      `No evidence for pull request ${values.pr} at ${sha.slice(0, 8)}; drive it with run.mjs --pr ${values.pr} first`,
    );
  }
  const body = fitComment({
    features,
    sha,
    repo: parseRepository(git(["remote", "get-url", "origin"])),
    folder: mediaFolder(git(["branch", "--show-current"])),
  });
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
    const { action, url } = publish({
      repo,
      pr: values.pr,
      bodyFile,
      screenshots: shots.map((s) => join(staging, s)),
    });
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
