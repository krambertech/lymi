#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const BASELINE = "scripts/comment-baseline.json";
const SOURCE = ["*.ts", "*.tsx", "*.mts", "*.cts", "*.js", "*.jsx", "*.mjs", "*.cjs"];
const GENERATED =
  /(^|\/)(worker-configuration\.d\.ts|[^/]*\.gen\.(ts|tsx|js|mjs)|uniwind-types\.d\.ts)$|(^|\/)(dist|public|migrations|node_modules)\/|^apps\/mobile\/contract\/|^apps\/web\/src\/server\/enrichment\/runs\/|^design\//;

const TOOL_DIRECTIVE =
  /^(\/\/\/?|\/\*\*?)\s*(biome-ignore(-all|-start|-end)?\b|@ts-(expect-error|ignore|nocheck|check)\b|check-styling: allow\b|<reference\s)/;
const BARE_DIRECTIVE =
  /^\/\*\*?\s*([@#]__PURE__|@vite-ignore|@internal|(@vitest-environment|@jsxImportSource)\s+\S+)\s*\*\/$/;
const TYPE_TAG = /^\/\*\*\s*@(type|typedef|satisfies)\s*\{/;

export function isDirective(text) {
  return TOOL_DIRECTIVE.test(text) || BARE_DIRECTIVE.test(text) || TYPE_TAG.test(text);
}

function scriptKind(file) {
  if (/\.(tsx|jsx)$/.test(file)) return ts.ScriptKind.TSX;
  if (/\.(m|c)?js$/.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export function commentsIn(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
  const seen = new Map();
  const text = [];
  const collect = (position) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(source, position) ?? []),
      ...(ts.getTrailingCommentRanges(source, position) ?? []),
    ]) {
      if (seen.has(range.pos)) continue;
      const text = source.slice(range.pos, range.end);
      if (text.startsWith("#!")) continue;
      const line = tree.getLineAndCharacterOfPosition(range.pos).line + 1;
      const lines = tree.getLineAndCharacterOfPosition(range.end).line + 2 - line;
      seen.set(range.pos, { line, lines, text, directive: isDirective(text) });
    }
  };
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.JsxText) text.push([node.pos, node.end]);
    collect(node.getFullStart());
    collect(node.getEnd());
    for (const child of node.getChildren(tree)) visit(child);
  };
  visit(tree);
  const inText = (pos) => text.some(([start, end]) => pos >= start && pos < end);
  return [...seen.entries()]
    .filter(([pos]) => !inText(pos))
    .map(([, comment]) => comment)
    .sort((a, b) => a.line - b.line);
}

export function proseLines(comments) {
  return comments.filter((comment) => !comment.directive).reduce((sum, c) => sum + c.lines, 0);
}

function trackedSources() {
  return execFileSync("git", ["ls-files", "-z", "--", ...SOURCE], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter((file) => file && !GENERATED.test(file));
}

export function measure(files, read) {
  const counts = {};
  for (const file of files) {
    const lines = proseLines(commentsIn(file, read(file)));
    if (lines > 0) counts[file] = lines;
  }
  return counts;
}

export function compare(baseline, counts) {
  const grown = [];
  const shrunk = [];
  for (const file of new Set([...Object.keys(baseline), ...Object.keys(counts)])) {
    const allowed = baseline[file] ?? 0;
    const actual = counts[file] ?? 0;
    if (actual > allowed) grown.push({ file, allowed, actual });
    else if (actual < allowed) shrunk.push({ file, allowed, actual });
  }
  return { grown: grown.sort(byFile), shrunk: shrunk.sort(byFile) };
}

const byFile = (a, b) => a.file.localeCompare(b.file);

export function nextBaseline(baseline, counts) {
  if (baseline === undefined) return { grown: [], next: counts };
  const { grown } = compare(baseline, counts);
  return { grown, next: grown.length > 0 ? baseline : counts };
}

export function serialize(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

function reportGrown(grown) {
  for (const { file, allowed, actual } of grown) {
    console.error(
      `${file}: ${actual} comment lines, ${allowed} allowed. Put the reason in a name, a type, a test or an ADR instead (CODING_STANDARDS.md#write-no-comments).`,
    );
  }
}

function main(args) {
  const files = trackedSources();
  const counts = measure(files, (file) => readFileSync(resolve(root, file), "utf8"));
  const baselinePath = resolve(root, BASELINE);
  if (args.includes("--update")) {
    const current = existsSync(baselinePath)
      ? JSON.parse(readFileSync(baselinePath, "utf8"))
      : undefined;
    const { grown, next } = nextBaseline(current, counts);
    if (grown.length > 0) {
      reportGrown(grown);
      console.error("The baseline only falls; delete these comments before updating it.");
      return 1;
    }
    writeFileSync(baselinePath, serialize(next));
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    console.log(`${BASELINE}: ${total} comment lines in ${Object.keys(counts).length} files.`);
    return 0;
  }
  if (args.includes("--list")) {
    const target = args[args.indexOf("--list") + 1];
    for (const file of files.filter((f) => !target || f.startsWith(target))) {
      for (const comment of commentsIn(file, readFileSync(resolve(root, file), "utf8"))) {
        if (!comment.directive) console.log(`${file}:${comment.line}\n${comment.text}\n`);
      }
    }
    return 0;
  }
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const { grown, shrunk } = compare(baseline, counts);
  reportGrown(grown);
  for (const { file, allowed, actual } of shrunk) {
    console.error(`${file}: ${actual} comment lines, baseline still allows ${allowed}.`);
  }
  if (shrunk.length > 0) console.error("Lower the baseline: pnpm check:comments --update");
  return grown.length + shrunk.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
