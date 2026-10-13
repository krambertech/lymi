#!/usr/bin/env node

// Fails on raw colours, stock Tailwind colours and physical directions added since the base branch.
// Usage: node scripts/check-styling.mjs [base]; BASE_SHA or the merge base with origin/main by default.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCOPE = ["apps/web/src/client", "apps/site/src", "apps/mobile/src"];
const CHECKED = /\.(tsx?|astro|css|mdx)$/;
const SKIPPED = /\.(test|browser\.test|gen)\.|\/locales\//;
/** Put this on the line, or the line above, for a colour that is not Lymi's, such as a brand mark. */
export const ALLOW = "check-styling: allow";

const STOCK =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITY =
  "bg|text|border|ring|ring-offset|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide|placeholder";
const LOGICAL = {
  ml: "ms",
  mr: "me",
  pl: "ps",
  pr: "pe",
  left: "start",
  right: "end",
  "border-l": "border-s",
  "border-r": "border-e",
  "rounded-l": "rounded-s",
  "rounded-r": "rounded-e",
  "rounded-tl": "rounded-ss",
  "rounded-tr": "rounded-se",
  "rounded-bl": "rounded-es",
  "rounded-br": "rounded-ee",
  "scroll-ml": "scroll-ms",
  "scroll-mr": "scroll-me",
  "scroll-pl": "scroll-ps",
  "scroll-pr": "scroll-pe",
  "text-left": "text-start",
  "text-right": "text-end",
  "float-left": "float-start",
  "float-right": "float-end",
};
// Native left and right offsets stay unchecked, since `left` also names what remains in a session.
const NATIVE = {
  marginLeft: "marginStart",
  marginRight: "marginEnd",
  paddingLeft: "paddingStart",
  paddingRight: "paddingEnd",
  borderLeftWidth: "borderStartWidth",
  borderRightWidth: "borderEndWidth",
};
const CSS = {
  "margin-left": "margin-inline-start",
  "margin-right": "margin-inline-end",
  "padding-left": "padding-inline-start",
  "padding-right": "padding-inline-end",
  "border-left": "border-inline-start",
  "border-right": "border-inline-end",
  left: "inset-inline-start",
  right: "inset-inline-end",
};

const prefixes = Object.keys(LOGICAL)
  .sort((a, b) => b.length - a.length)
  .join("|");
const classStart = String.raw`(?<=^|[\s"'\`:!{(])-?`;
const bare = prefixes
  .split("|")
  .filter((prefix) => prefix.includes("-"))
  .join("|");
const physicalClass = new RegExp(
  String.raw`${classStart}(?:(${prefixes})-(?!1\/2\b)(?:\d[\w.\/]*|\[[^\]\s]*\]?|\([^)\s]*\)?|(?:px|auto|full|screen|none|xs|sm|md|lg|\d?xl)\b)|(${bare})(?=[\s"'\`)}]|$))`,
  "g",
);
const stockColour = new RegExp(String.raw`${classStart}(?:${UTILITY})-(?:${STOCK})-\d{2,3}\b`, "g");
const rawHex = /(?<=["'`[]|:\s*)#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
const nativeProp = new RegExp(String.raw`\b(${Object.keys(NATIVE).join("|")})\s*:`, "g");
// `left: 50%` centres rather than leans.
const centred = /^\s*["'`]?-?50%/;
const cssProp = new RegExp(
  String.raw`(?<![\w-])(${Object.keys(CSS).join("|")})(?:-(?:width|color|style))?\s*:(?!:)`,
  "g",
);
const cssText = /\.(css|astro)$/;
// An in-page link such as href="#add" is spelled in hex letters too.
const anchor = /(?:href|to|hash|id)\s*(?:={1,3}|:)\s*["'`]?$/;

/** Every problem on one added line, each naming its fix. */
export function problemsIn(file, line) {
  const problems = [];
  for (const { 0: hex, index } of line.matchAll(rawHex)) {
    if (anchor.test(line.slice(0, index))) continue;
    problems.push(
      `raw colour ${hex}: use a Lymi token such as bg-plate or text-text-2; dark mode is its own palette, not an inversion`,
    );
  }
  for (const [stock] of line.matchAll(stockColour)) {
    problems.push(
      `stock Tailwind colour ${stock}: use a Lymi token from packages/design/tokens.css`,
    );
  }
  for (const match of line.matchAll(physicalClass)) {
    const [found, prefix = match[2]] = match;
    problems.push(`physical ${found}: use ${found.replace(prefix, LOGICAL[prefix])}`);
  }
  if (file.startsWith("apps/mobile/")) {
    for (const [, prop] of line.matchAll(nativeProp)) {
      problems.push(`physical ${prop}: use ${NATIVE[prop]}`);
    }
  }
  if (cssText.test(file)) {
    for (const { 0: found, 1: prop, index } of line.matchAll(cssProp)) {
      if (!prop.includes("-") && !file.endsWith(".css")) continue;
      if (centred.test(line.slice(index + found.length))) continue;
      problems.push(
        `physical ${found.replace(/\s*:$/, "")}: use ${found.replace(prop, CSS[prop]).replace(/\s*:$/, "")}`,
      );
    }
  }
  return problems;
}

/** Added lines in a zero-context unified diff, with their file and new line number. */
export function addedLines(diff) {
  const added = [];
  let file = null;
  let number = 0;
  let previous = "";
  for (const text of diff.split("\n")) {
    if (text.startsWith("+++ ")) {
      file = text.startsWith("+++ b/") ? text.slice(6) : null;
      continue;
    }
    const hunk = /^@@ -\S+ \+(\d+)/.exec(text);
    if (hunk) {
      number = Number(hunk[1]);
      previous = "";
      continue;
    }
    if (!file || !text.startsWith("+")) continue;
    added.push({ file, number, text: text.slice(1), previous });
    previous = text.slice(1);
    number++;
  }
  return added;
}

export function check(diff) {
  const found = [];
  for (const { file, number, text, previous } of addedLines(diff)) {
    if (!CHECKED.test(file) || SKIPPED.test(file)) continue;
    if (text.includes(ALLOW) || previous.includes(ALLOW)) continue;
    for (const problem of problemsIn(file, text)) found.push(`${file}:${number}: ${problem}`);
  }
  return found;
}

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
  return result.status === 0 ? result.stdout.trim() : null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base =
    process.argv[2] ?? (process.env.BASE_SHA || git(["merge-base", "origin/main", "HEAD"]));
  if (!base) {
    console.log("check-styling: no base to compare with, so nothing to check");
    process.exit(0);
  }
  const diff = git(["diff", "--unified=0", "--no-color", "--no-ext-diff", base, "--", ...SCOPE]);
  if (diff === null) {
    console.error(`check-styling: could not diff against ${base}`);
    process.exit(1);
  }
  const found = check(diff);
  if (found.length === 0) {
    console.log("check-styling: no raw colours, stock colours or physical directions added");
    process.exit(0);
  }
  console.error(found.join("\n"));
  console.error(
    `\nAGENTS.md, Styling. For a colour that is not Lymi's, such as a brand mark, add "${ALLOW}: <reason>" in a comment on or above the line.`,
  );
  process.exit(1);
}
