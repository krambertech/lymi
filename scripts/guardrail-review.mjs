#!/usr/bin/env node

// Names the guardrails a pull request changes, and in CI fails until the reviewer approves its head commit.
// Usage: node scripts/guardrail-review.mjs lists what the branch changes against origin/main; docs/testing.md.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { posix } from "node:path";
import { pathToFileURL } from "node:url";

export const GATE_FILES = [
  ".github/workflows/guardrail-review.yml",
  "scripts/guardrail-review.mjs",
];
export const APPROVE_COMMAND = "/approve-guardrails";

const PACKAGE_FILE = /^(?:(?:apps|packages)\/[^/]+\/)?package\.json$/;
const GUARDRAIL_SCRIPT = /^check(?::.+)?$/;
const RUN_FILE = /\.(?:[cm]?[jt]sx?|sh|py|grit)$/;
// Generated files carry their tool's suppressions, and prose only quotes them.
const UNSCANNED = /(?:^|\/)(?:worker-configuration\.d\.ts|migrations\/)|\.gen\.|\.md$/;
const DIRECTIVE =
  /(?:\/\/|\/\*|<!--)\s*(biome-ignore(?:-all|-start|-end)?|@ts-expect-error|@ts-ignore|@ts-nocheck|(?:es|ox)lint-disable(?:-next-line|-line)?)(?![\w-])(.*)$/;
const PLACEHOLDER = /^(?:<[^>]*>|explanation|reason|todo|fixme|tbd|n\/?a)$/i;

export function parseDiff(text) {
  const files = [];
  let file;
  let line = 0;
  for (const row of text.split("\n")) {
    if (row.startsWith("diff --git ")) {
      file = { path: / b\/(.*)$/.exec(row)?.[1], added: [] };
      files.push(file);
    } else if (!file || row.startsWith("--- ")) {
    } else if (row.startsWith("+++ ")) {
      file.path = stripPrefix(row.slice(4)) ?? file.path;
    } else if (row.startsWith("@@")) {
      line = Number(/\+(\d+)/.exec(row)?.[1] ?? 0);
    } else if (row.startsWith("+")) {
      file.added.push({ line, text: row.slice(1) });
      line += 1;
    } else if (row.startsWith(" ")) {
      line += 1;
    }
  }
  return files.filter((candidate) => candidate.path);
}

function stripPrefix(value) {
  if (value === "/dev/null") return undefined;
  return value.replace(/^[ab]\//, "");
}

/** Returns why a line's suppression lacks a reason, or undefined when it has one or is not a suppression. */
export function unexplainedSuppression(text) {
  const match = DIRECTIVE.exec(text);
  if (!match) return undefined;
  const [, directive, tail] = match;
  if (directive === "biome-ignore-end") return undefined;

  const rest = tail.replace(/\s*(?:\*\/\s*\}?|-->)\s*$/, "");
  let reason;
  if (directive.startsWith("biome-ignore")) {
    const colon = rest.indexOf(":");
    reason = colon === -1 ? "" : rest.slice(colon + 1);
  } else if (directive.includes("lint-disable")) {
    const separator = rest.indexOf(" -- ");
    reason = separator === -1 ? "" : rest.slice(separator + 4);
  } else {
    reason = rest.replace(/^[\s:-]+/, "");
  }
  reason = reason.trim();
  if (/\p{L}{2,}/u.test(reason) && !PLACEHOLDER.test(reason)) return undefined;
  return directive;
}

function parseJson(text) {
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function enforcedRules(text) {
  const match = /^## Enforced rules\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text ?? "");
  return match?.[1];
}

/** The scripts and files named in the table's Check column. */
function tableChecks(text) {
  const scripts = [];
  const files = [];
  for (const row of (enforcedRules(text) ?? "").split("\n")) {
    const check = row.trim().startsWith("|") ? row.split("|").at(-2) : undefined;
    for (const [, code] of check?.matchAll(/`([^`]+)`/g) ?? []) {
      const script = /^pnpm ([\w:-]+)$/.exec(code)?.[1];
      if (script) scripts.push(script);
      else if (code.includes("/") && RUN_FILE.test(code)) files.push(code);
    }
  }
  return { scripts, files };
}

function readPackages(tree) {
  const packages = new Map();
  for (const path of tree.list().filter((candidate) => PACKAGE_FILE.test(candidate))) {
    const manifest = parseJson(tree.read(path));
    if (!manifest) continue;
    packages.set(path, {
      dir: posix.dirname(path),
      name: manifest.name,
      scripts: manifest.scripts ?? {},
    });
  }
  return packages;
}

function pnpmTargets(tokens, from, packages) {
  const filters = [];
  let recursive = false;
  let script;
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "-r" || token === "--recursive") recursive = true;
    else if (token === "--filter" || token === "-F") filters.push(tokens[++index]);
    else if (token.startsWith("--filter=")) filters.push(token.slice(9));
    else if (token === "exec" || token === "dlx") return [];
    else if (token === "run" || token.startsWith("-")) continue;
    else {
      script = token;
      break;
    }
  }
  if (!script) return [];

  let targets = [from];
  if (filters.length > 0) {
    const names = filters.map((filter) => filter.replace(/^["']|["']$/g, ""));
    targets = [...packages.keys()].filter((path) => names.includes(packages.get(path).name));
  } else if (recursive) {
    targets = [...packages.keys()].filter((path) => path !== "package.json");
  }
  return targets.map((path) => [path, script]);
}

/** Every check script, the scripts it calls through pnpm, and the files they run, at one tree. */
export function guardrailScripts(tree) {
  const packages = readPackages(tree);
  const queue = [];
  for (const [path, manifest] of packages) {
    for (const name of Object.keys(manifest.scripts)) {
      if (GUARDRAIL_SCRIPT.test(name)) queue.push([path, name]);
    }
  }
  const table = tableChecks(tree.read("AGENTS.md"));
  for (const name of table.scripts) queue.push(["package.json", name]);

  const scripts = new Map();
  const files = new Map(table.files.map((file) => [file, "named in the enforced-rules table"]));
  while (queue.length > 0) {
    const [path, name] = queue.shift();
    const key = `${path} ${name}`;
    const manifest = packages.get(path);
    const command = manifest?.scripts[name];
    if (command === undefined || scripts.has(key)) continue;
    scripts.set(key, { path, name, command });

    for (const segment of command.split(/&&|\|\||;|\|/)) {
      const tokens = segment.trim().split(/\s+/);
      if (tokens[0] === "pnpm") queue.push(...pnpmTargets(tokens, path, packages));
      for (const token of tokens) {
        if (!token.startsWith("-") && RUN_FILE.test(token)) {
          const file = posix.normalize(posix.join(manifest.dir, token));
          if (!files.has(file)) files.set(file, `run by \`${name}\``);
        }
      }
    }
  }
  return { scripts, files };
}

function biomeSections(config) {
  const overrides = Array.isArray(config.overrides) ? config.overrides : [];
  const scoped = (key) =>
    overrides.filter((entry) => entry[key]).map((entry) => [entry.includes, entry[key]]);
  return {
    "Lint plugins or the files they cover": [config.plugins, scoped("plugins")],
    "Lint rules or the files they cover": [
      config.linter?.enabled,
      config.linter?.rules,
      scoped("linter"),
    ],
    "Files excluded from lint": [config.files?.includes, config.linter?.includes],
  };
}

function biomePlugins(config) {
  if (!config) return [];
  const overrides = Array.isArray(config.overrides) ? config.overrides : [];
  return [config.plugins ?? [], ...overrides.map((entry) => entry.plugins ?? [])]
    .flat()
    .filter((plugin) => typeof plugin === "string")
    .map((plugin) => posix.normalize(plugin));
}

/**
 * Lists each guardrail a diff changes. `changes` is `parseDiff` output; `base` and `head` read the trees
 * on either side, each as `{ read(path) => text | undefined, list() => paths }`.
 */
export function guardrailChanges({ changes, base, head }) {
  const found = [];
  const changed = new Set(changes.map((change) => change.path));

  for (const change of changes) {
    if (UNSCANNED.test(change.path) || GATE_FILES.includes(change.path)) continue;
    for (const { line, text } of change.added) {
      const directive = unexplainedSuppression(text);
      if (directive) {
        found.push(`\`${directive}\` without a reason at \`${change.path}:${line}\``);
      }
    }
  }

  for (const path of GATE_FILES) {
    if (changed.has(path)) found.push(`This gate's own \`${path}\``);
  }

  const baseBiome = parseJson(base.read("biome.json"));
  const headBiome = parseJson(head.read("biome.json"));
  const plugins = new Set([...biomePlugins(baseBiome), ...biomePlugins(headBiome)]);
  const reported = new Set();
  for (const path of [...changed].sort()) {
    if (path.startsWith("biome-plugins/") || plugins.has(path)) {
      reported.add(path);
      found.push(`Lint plugin \`${path}\``);
    }
  }

  if (changed.has("biome.json")) {
    if (!baseBiome || !headBiome) {
      found.push("`biome.json`, which no longer parses or exists on one side");
    } else {
      const before = biomeSections(baseBiome);
      const after = biomeSections(headBiome);
      for (const section of Object.keys(before)) {
        if (JSON.stringify(before[section]) !== JSON.stringify(after[section])) {
          found.push(`${section} in \`biome.json\``);
        }
      }
    }
  }

  const before = guardrailScripts(base);
  const after = guardrailScripts(head);
  for (const key of new Set([...before.scripts.keys(), ...after.scripts.keys()])) {
    const { path, name } = before.scripts.get(key) ?? after.scripts.get(key);
    if (before.scripts.get(key)?.command !== after.scripts.get(key)?.command) {
      found.push(`Check script \`${name}\` in \`${path}\``);
    }
  }
  const runFiles = new Map([...before.files, ...after.files]);
  for (const path of [...changed].sort()) {
    if (runFiles.has(path) && !GATE_FILES.includes(path) && !reported.has(path)) {
      found.push(`\`${path}\`, ${runFiles.get(path)}`);
    }
  }

  if (enforcedRules(base.read("AGENTS.md")) !== enforcedRules(head.read("AGENTS.md"))) {
    found.push("The enforced-rules table in `AGENTS.md`");
  }

  return [...new Set(found)];
}

/** Whether the reviewer's latest word on the head commit approves it; `reviews` is in API order. */
export function approvedAt(reviews, { reviewer, headSha }) {
  let approved = false;
  for (const review of reviews) {
    if (review.user?.login?.toLowerCase() !== reviewer.toLowerCase()) continue;
    if (review.commit_id !== headSha) continue;
    const command = review.body
      ?.split("\n")
      .some((line) => line.trim().toLowerCase() === APPROVE_COMMAND);
    if (review.state === "APPROVED" || (review.state === "COMMENTED" && command)) approved = true;
    else if (review.state === "CHANGES_REQUESTED") approved = false;
  }
  return approved;
}

export function renderSummary({ guardrails, approved, reviewer, headSha }) {
  const short = headSha.slice(0, 7);
  if (guardrails.length === 0) {
    return "## Guardrail review\n\nThis pull request changes no guardrail.\n";
  }
  const status = approved
    ? `@${reviewer} approved head \`${short}\`. A later push needs approval again.`
    : `Waiting for @${reviewer} to approve head \`${short}\`: approve the pull request, or, on one opened from that account, submit a review whose own line reads \`${APPROVE_COMMAND}\`. A later push needs approval again.`;
  return [
    "## Guardrail review",
    "",
    "This pull request changes guardrails:",
    "",
    ...guardrails.map((guardrail) => `- ${guardrail}`),
    "",
    status,
    "",
  ].join("\n");
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

function gitTree(ref) {
  let paths;
  return {
    read(path) {
      try {
        return git("show", `${ref}:${path}`);
      } catch {
        return undefined;
      }
    },
    list() {
      paths ??= git("ls-tree", "-r", "--name-only", ref).split("\n");
      return paths;
    },
  };
}

async function fetchReviews({ repository, number, token }) {
  const reviews = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/pulls/${number}/reviews?per_page=100&page=${page}`,
      { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" } },
    );
    if (!response.ok) throw new Error(`Reading reviews failed: ${response.status}`);
    const batch = await response.json();
    reviews.push(...batch);
    if (batch.length < 100) return reviews;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  const inCi = Boolean(env.HEAD_SHA);
  const headSha = inCi ? env.HEAD_SHA : git("rev-parse", "HEAD").trim();
  const mergeBase = git("merge-base", inCi ? env.BASE_SHA : "origin/main", headSha).trim();
  const changes = parseDiff(git("diff", "--no-renames", "--no-color", "-U0", mergeBase, headSha));
  const guardrails = guardrailChanges({
    changes,
    base: gitTree(mergeBase),
    head: gitTree(headSha),
  });

  if (!inCi) {
    console.log(
      guardrails.length === 0
        ? "This branch changes no guardrail."
        : `This branch changes guardrails, so its pull request waits for review:\n${guardrails.map((guardrail) => `- ${guardrail}`).join("\n")}`,
    );
  } else {
    const reviewer = env.GUARDRAIL_REVIEWER;
    const approved =
      guardrails.length > 0 &&
      approvedAt(
        await fetchReviews({
          repository: env.REPOSITORY,
          number: env.PR_NUMBER,
          token: env.GITHUB_TOKEN,
        }),
        { reviewer, headSha },
      );
    const summary = renderSummary({ guardrails, approved, reviewer, headSha });
    console.log(summary);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
    if (guardrails.length > 0 && !approved) {
      for (const guardrail of guardrails) {
        console.log(`::error title=Guardrail waits for @${reviewer}::${guardrail}`);
      }
      process.exitCode = 1;
    }
  }
}
