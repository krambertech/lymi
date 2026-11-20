#!/usr/bin/env node

// Prints the reliability checklist items a change's diff triggers, for the reviewer to answer.
// The items load from the base branch, so a change cannot edit the checklist that judges it.
// Usage: node scripts/reliability.mjs [base], where base defaults to origin/main.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CHECKLIST = "scripts/reliability-checklist.mjs";

/** A path glob as a regular expression: `**` crosses folders, `*` and `?` stay inside one. */
export function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      source += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") source += "[^/]*";
    else if (c === "?") source += "[^/]";
    else if (c === "{") {
      const end = glob.indexOf("}", i);
      source += `(?:${glob
        .slice(i + 1, end)
        .split(",")
        .map((part) => part.replace(/[.+^$()|[\]\\]/g, "\\$&"))
        .join("|")})`;
      i = end;
    } else source += c.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

/**
 * Each changed file with the lines it adds, from `git diff --unified=0` output. File headers are
 * read only between `diff --git` and the first hunk, so an added `++ x` or removed `-- x` line is
 * content. A deleted or binary file is listed with no lines.
 */
export function parseDiff(text) {
  const files = new Map();
  let current = null;
  let header = false;
  const list = (path) => {
    if (!files.has(path)) files.set(path, []);
    return path;
  };
  for (const line of text.split("\n")) {
    if (line.startsWith("diff --git ")) {
      header = true;
      const named = line.match(/^diff --git a\/.+ b\/(.+)$/);
      current = named ? list(named[1]) : null;
    } else if (header && line.startsWith("@@")) header = false;
    else if (header && line.startsWith("+++ ")) {
      const path = line.slice(4);
      if (path !== "/dev/null") current = list(path.replace(/^b\//, ""));
    } else if (!header && current && line.startsWith("+")) files.get(current).push(line.slice(1));
  }
  return files;
}

/**
 * The items a diff triggers, each with the files and first added line that triggered it. An item
 * fires on any change to one of its `files`, and on a change to one of its `paths` that adds a line
 * matching `added`, or any change there when it has no `added`. `ignore` overrides both.
 */
export function triggered(items, files) {
  const fired = [];
  for (const item of items) {
    const whole = (item.files ?? []).map(globToRegExp);
    const paths = (item.paths ?? []).map(globToRegExp);
    const ignore = (item.ignore ?? []).map(globToRegExp);
    const hits = [];
    for (const [file, added] of files) {
      if (ignore.some((p) => p.test(file))) continue;
      if (whole.some((p) => p.test(file))) {
        hits.push({ file });
        continue;
      }
      if (!paths.some((p) => p.test(file))) continue;
      if (!item.added) {
        hits.push({ file });
        continue;
      }
      const line = added.find((text) => item.added.test(text));
      if (line !== undefined) hits.push({ file, line: line.trim() });
    }
    if (hits.length) fired.push({ item, hits });
  }
  return fired;
}

/** The checklist as Markdown for a reviewer: one section per item, with what triggered it. */
export function report(fired, { base, fromBase }) {
  const note = fromBase
    ? []
    : [`${base} has no checklist yet, so these come from the working tree.`];
  if (fired.length === 0)
    return [`No reliability checklist item matches this diff against ${base}.`, ...note].join("\n");
  const lines = [
    `${fired.length} reliability checklist ${fired.length === 1 ? "item matches" : "items match"} this diff against ${base}.`,
  ];
  lines.push(...note);
  for (const { item, hits } of fired) {
    lines.push("", `### ${item.id}`, "", item.check, "", `Why: ${item.why}`);
    lines.push(`Evidence: ${item.sources.map((n) => `#${n}`).join(", ")}`);
    const shown = hits
      .slice(0, 5)
      .map((hit) => (hit.line ? `${hit.file}: \`${hit.line.slice(0, 100)}\`` : hit.file));
    lines.push(
      `Triggered by: ${shown.join("; ")}${hits.length > 5 ? `; and ${hits.length - 5} more` : ""}`,
    );
  }
  return lines.join("\n");
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/**
 * The checklist's source on the base branch, or null when the base has no checklist yet. Any other
 * failure, such as a base that was never fetched, throws rather than trusting the branch's own list.
 */
export function checklistSource(base, run) {
  try {
    run("rev-parse", "--verify", `${base}^{commit}`);
  } catch {
    throw new Error(`reliability: cannot read ${base}; run git fetch origin main first`);
  }
  try {
    run("cat-file", "-e", `${base}:${CHECKLIST}`);
  } catch {
    return null;
  }
  return run("show", `${base}:${CHECKLIST}`);
}

/** The checklist as the base branch has it, or the working tree's when the base has none. */
async function loadItems(base) {
  const source = checklistSource(base, git);
  if (source === null) {
    const { ITEMS } = await import(pathToFileURL(join(root, CHECKLIST)).href);
    return { items: ITEMS, fromBase: false };
  }
  const dir = mkdtempSync(join(tmpdir(), "lymi-reliability-"));
  try {
    const file = join(dir, "checklist.mjs");
    writeFileSync(file, source);
    const { ITEMS } = await import(pathToFileURL(file).href);
    return { items: ITEMS, fromBase: true };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Committed, staged and unstaged changes since the merge base, plus untracked files. */
function changedFiles(base) {
  const mergeBase = git("merge-base", base, "HEAD").trim();
  const files = parseDiff(git("diff", "--unified=0", "--no-color", "--no-ext-diff", mergeBase));
  for (const path of git("ls-files", "--others", "--exclude-standard")
    .split("\n")
    .filter(Boolean)) {
    files.set(path, readFileSync(join(root, path), "utf8").split("\n"));
  }
  return files;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.argv[2] ?? "origin/main";
  try {
    const { items, fromBase } = await loadItems(base);
    console.log(report(triggered(items, changedFiles(base)), { base, fromBase }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
