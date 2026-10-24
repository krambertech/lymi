#!/usr/bin/env node

// Names each change that may loosen a guardrail, and in CI fails until the reviewer approves the head commit.
// Usage: node scripts/guardrail-review.mjs lists what the branch loosens against origin/main; docs/testing.md.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { posix } from "node:path";
import { pathToFileURL } from "node:url";

export const GATE_FILES = [
  ".github/workflows/guardrail-review.yml",
  "scripts/guardrail-review.mjs",
  "scripts/guardrail-review.test.mjs",
];
export const APPROVE_COMMAND = "/approve-guardrails";

const PACKAGE_FILE = /^(?:(?:apps|packages)\/[^/]+\/)?package\.json$/;
const GUARDRAIL_SCRIPT = /^check(?::.+)?$/;
const RUN_FILE = /\.(?:[cm]?[jt]sx?|sh|py|grit)$/;
// Generated files carry their tool's suppressions, and prose only quotes them.
const UNSCANNED = /(?:^|\/)(?:worker-configuration\.d\.ts|migrations\/)|\.gen\.|\.md$/;
const DIRECTIVE =
  /(?:\/\/|\/\*|<!--)\s*(biome-ignore(?:-all|-start|-end)?|@ts-expect-error|@ts-ignore|@ts-nocheck|(?:es|ox)lint-disable(?:-next-line|-line)?|check-styling: allow)(?![\w-])(.*)$/;
const PLACEHOLDER = /^(?:<[^>]*>|explanation|reason|todo|fixme|tbd|n\/?a)$/i;
const LEVELS = { off: 0, info: 1, warn: 2, error: 3 };
// Keys that only shape formatting; any other unmodelled key in biome.json is held.
const BIOME_COSMETIC = new Set(["$schema", "formatter", "javascript", "json", "css", "assist"]);
const UNSURE = "the gate cannot tell whether that loosens it";

export function parseDiff(text) {
  const files = [];
  let file;
  let line = 0;
  for (const row of text.split("\n")) {
    if (row.startsWith("diff --git ")) {
      file = { path: / b\/(.*)$/.exec(row)?.[1], status: "modified", added: [] };
      files.push(file);
    } else if (!file) {
    } else if (row.startsWith("new file mode")) {
      file.status = "added";
    } else if (row.startsWith("deleted file mode")) {
      file.status = "deleted";
    } else if (row.startsWith("--- ")) {
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
  if (directive.startsWith("biome-ignore") || directive === "check-styling: allow") {
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

function level(setting) {
  if (typeof setting === "boolean") return setting ? LEVELS.error : LEVELS.off;
  return LEVELS[typeof setting === "object" ? setting?.level : setting];
}

function options(setting) {
  if (typeof setting !== "object" || setting === null) return "{}";
  return JSON.stringify({ ...setting, level: undefined, fix: undefined });
}

function splitIncludes(includes) {
  const list = Array.isArray(includes) ? includes : [];
  const targets = list.filter((entry) => !entry.startsWith("!")).sort();
  return {
    targets,
    scope: targets.join(", ") || "every file",
    excludes: list.filter((entry) => entry.startsWith("!")),
  };
}

/** Each rule, plugin and linter switch in biome.json, keyed by what it is and the files it targets. */
function biomeUnits(config) {
  const units = new Map();
  const add = (kind, name, includes, setting) => {
    const { targets, scope, excludes } = splitIncludes(includes);
    units.set(`${kind} ${name} | ${scope}`, { kind, name, targets, scope, excludes, setting });
  };
  const addRules = (rules, includes) => {
    for (const [group, value] of Object.entries(rules ?? {})) {
      if (typeof value !== "object" || value === null) add("rule", group, includes, value);
      else
        for (const [rule, setting] of Object.entries(value))
          add("rule", `${group}/${rule}`, includes, setting);
    }
  };

  add("linter", "the linter", undefined, config.linter?.enabled ?? true);
  addRules(config.linter?.rules);
  for (const plugin of config.plugins ?? []) add("plugin", plugin, undefined, true);
  for (const entry of Array.isArray(config.overrides) ? config.overrides : []) {
    for (const plugin of entry.plugins ?? []) add("plugin", plugin, entry.includes, true);
    addRules(entry.linter?.rules, entry.includes);
    if (entry.linter?.enabled !== undefined) {
      add("linter", "the linter", entry.includes, entry.linter.enabled);
    }
  }
  return units;
}

/** Whether another unit covers the same files and more, with no new exclusion and no lower level. */
function widened(unit, units) {
  return [...units.values()].some(
    (other) =>
      other.kind === unit.kind &&
      other.name === unit.name &&
      unit.targets.length > 0 &&
      unit.targets.every((target) => other.targets.includes(target)) &&
      other.excludes.every((entry) => unit.excludes.includes(entry)) &&
      options(other.setting) === options(unit.setting) &&
      (level(other.setting) ?? -1) >= (level(unit.setting) ?? Number.POSITIVE_INFINITY),
  );
}

function biomeOther(config) {
  const rest = Object.fromEntries(
    Object.entries(config).filter(
      ([key]) => !BIOME_COSMETIC.has(key) && !["overrides", "plugins"].includes(key),
    ),
  );
  rest.files = { ...rest.files, includes: undefined };
  rest.linter = { ...rest.linter, includes: undefined, rules: undefined, enabled: undefined };
  return rest;
}

function biomeLoosening(before, after) {
  const found = [];
  for (const key of ["files", "linter"]) {
    const old = before[key]?.includes;
    const now = after[key]?.includes;
    if (old === undefined && now === undefined) continue;
    const oldList = old ?? ["**"];
    const nowList = now ?? ["**"];
    for (const entry of nowList.filter((item) => item.startsWith("!") && !oldList.includes(item))) {
      found.push(`Adds the lint exclusion \`${entry}\` to \`${key}.includes\` in \`biome.json\``);
    }
    for (const entry of oldList.filter(
      (item) => !item.startsWith("!") && !nowList.includes(item),
    )) {
      found.push(
        `Drops \`${entry}\` from \`${key}.includes\` in \`biome.json\`, so less is linted`,
      );
    }
  }

  const old = biomeUnits(before);
  const now = biomeUnits(after);
  for (const [key, unit] of old) {
    const next = now.get(key);
    const where = `\`${unit.name}\` for \`${unit.scope}\` in \`biome.json\``;
    if (!next) {
      if (!(unit.kind === "rule" && level(unit.setting) === LEVELS.off) && !widened(unit, now)) {
        found.push(`Removes or rescopes ${where}`);
      }
      continue;
    }
    for (const entry of next.excludes.filter((item) => !unit.excludes.includes(item))) {
      found.push(`Adds the exclusion \`${entry}\` to ${where}`);
    }
    if (JSON.stringify(unit.setting) === JSON.stringify(next.setting)) continue;
    const from = level(unit.setting);
    const to = level(next.setting);
    if (from === undefined || to === undefined || options(unit.setting) !== options(next.setting)) {
      found.push(`Changes ${where}; ${UNSURE}`);
    } else if (to < from) {
      found.push(`Relaxes ${where}`);
    }
  }
  for (const [key, unit] of now) {
    if (old.has(key)) continue;
    if (level(unit.setting) === LEVELS.off) {
      found.push(`Turns off \`${unit.name}\` for \`${unit.scope}\` in \`biome.json\``);
    }
  }

  const otherBefore = biomeOther(before);
  const otherAfter = biomeOther(after);
  const keys = [...new Set([...Object.keys(otherBefore), ...Object.keys(otherAfter)])].filter(
    (key) => JSON.stringify(otherBefore[key]) !== JSON.stringify(otherAfter[key]),
  );
  if (keys.length > 0) {
    found.push(`Changes \`${keys.join("`, `")}\` in \`biome.json\`; ${UNSURE}`);
  }
  return found;
}

function biomePlugins(config) {
  if (!config) return [];
  const overrides = Array.isArray(config.overrides) ? config.overrides : [];
  return [config.plugins ?? [], ...overrides.map((entry) => entry.plugins ?? [])]
    .flat()
    .filter((plugin) => typeof plugin === "string")
    .map((plugin) => posix.normalize(plugin));
}

function commandSteps(command) {
  return command.split("&&").map((step) => step.trim().replace(/\s+/g, " "));
}

function tableRows(section) {
  return (section ?? "")
    .split("\n")
    .filter((row) => row.trim().startsWith("|") && !/^\|[\s|:-]+\|$/.test(row.trim()));
}

/**
 * Lists each change in a diff that may loosen a guardrail; additions and removed exclusions pass. `changes`
 * is `parseDiff` output; `base` and `head` read either tree as `{ read(path) => text | undefined, list() => paths }`.
 */
export function guardrailChanges({ changes, base, head }) {
  const found = [];
  const byPath = new Map(changes.map((change) => [change.path, change]));

  for (const change of changes) {
    if (UNSCANNED.test(change.path) || GATE_FILES.includes(change.path)) continue;
    for (const { line, text } of change.added) {
      const directive = unexplainedSuppression(text);
      if (directive) {
        found.push(`Adds \`${directive}\` without a reason at \`${change.path}:${line}\``);
      }
    }
  }

  for (const path of GATE_FILES) {
    if (byPath.has(path)) found.push(`Changes this gate's own \`${path}\``);
  }

  const baseBiome = parseJson(base.read("biome.json"));
  const headBiome = parseJson(head.read("biome.json"));
  if (byPath.has("biome.json")) {
    if (!baseBiome || !headBiome) {
      found.push(`Leaves \`biome.json\` missing or unparseable on one side; ${UNSURE}`);
    } else {
      found.push(...biomeLoosening(baseBiome, headBiome));
    }
  }

  const before = guardrailScripts(base);
  const after = guardrailScripts(head);
  for (const [key, script] of before.scripts) {
    const next = after.scripts.get(key);
    const where = `\`${script.name}\` in \`${script.path}\``;
    if (!next) {
      // A script still defined but no longer reached is named by the step or row that dropped it.
      if (parseJson(head.read(script.path))?.scripts?.[script.name] === undefined) {
        found.push(`Removes the check script ${where}`);
      }
      continue;
    }
    const kept = commandSteps(next.command);
    for (const step of commandSteps(script.command).filter((item) => !kept.includes(item))) {
      found.push(`Drops or rewrites \`${step}\` in ${where}`);
    }
  }

  const plugins = new Set([...biomePlugins(baseBiome), ...biomePlugins(headBiome)]);
  const runFiles = new Map([...before.files, ...after.files]);
  for (const { path, status } of [...changes].sort((a, b) => a.path.localeCompare(b.path))) {
    if (GATE_FILES.includes(path) || status === "added") continue;
    let named;
    if (path.startsWith("biome-plugins/") || plugins.has(path))
      named = `the lint plugin \`${path}\``;
    else if (runFiles.has(path)) named = `\`${path}\`, ${runFiles.get(path)}`;
    if (!named) continue;
    found.push(status === "deleted" ? `Deletes ${named}` : `Changes ${named}; ${UNSURE}`);
  }

  const baseTable = enforcedRules(base.read("AGENTS.md"));
  const headTable = enforcedRules(head.read("AGENTS.md"));
  if (baseTable !== undefined && headTable === undefined) {
    found.push("Removes the enforced-rules table from `AGENTS.md`");
  } else {
    const kept = tableRows(headTable);
    for (const row of tableRows(baseTable).filter((item) => !kept.includes(item))) {
      const rule = row.split("|")[1]?.trim() ?? row;
      found.push(
        `Removes or rewords the enforced-rules row \`${rule.slice(0, 80)}\` in \`AGENTS.md\``,
      );
    }
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
    return "## Guardrail review\n\nThis pull request loosens no guardrail.\n";
  }
  const status = approved
    ? `@${reviewer} approved head \`${short}\`. A later push needs approval again.`
    : `Waiting for @${reviewer} to approve head \`${short}\`: approve the pull request, or, on one opened from that account, submit a review whose own line reads \`${APPROVE_COMMAND}\`. A later push needs approval again.`;
  return [
    "## Guardrail review",
    "",
    "This pull request may loosen guardrails:",
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
        ? "This branch loosens no guardrail."
        : `This branch may loosen guardrails, so its pull request waits for review:\n${guardrails.map((guardrail) => `- ${guardrail}`).join("\n")}`,
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
