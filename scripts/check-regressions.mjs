#!/usr/bin/env node

// Fails on bug classes that reached pull requests before and that a lint rule on one file cannot see.
// Each check names the pull request that found it. Usage: node scripts/check-regressions.mjs

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SKIPPED = /\.(test|browser\.test|gen)\.|\/locales\//;

/** Claims about scheduling that are false: cards return at about 90% recall, not just before forgetting (#1117). */
const RETIRED_CLAIMS = [/before you(?:[’']d| would)? forget/i];

/** Product copy that ships: interface text and the store listing. */
export function claimProblems(file, source) {
  const found = [];
  for (const [index, line] of source.split("\n").entries()) {
    for (const claim of RETIRED_CLAIMS) {
      if (claim.test(line))
        found.push(
          `${file}:${index + 1}: cards come back as they start to fade, at about 90% recall, not just before the learner forgets; say "just as it starts to fade" (#1117)`,
        );
    }
  }
  return found;
}

const EDGE = /^edge(?:-strong|-lift|-drop|-inset)?$/;
const SHADOW = /^shadow(?:-|$)/;

/** Splits a class into its variant prefix and utility, ignoring colons inside brackets. */
function variantOf(token) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth--;
    else if (c === ":" && depth === 0) cut = i;
  }
  return { variant: token.slice(0, cut + 1), utility: token.slice(cut + 1) };
}

/** `edge` and its siblings own box-shadow, so a shadow utility under the same variants never draws (#1121). */
export function shadowProblems(file, source) {
  const found = [];
  for (const match of source.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)) {
    const text = match[1] ?? match[2] ?? match[3];
    if (!/\bedge\b/.test(text) || !/shadow/.test(text)) continue;
    const byVariant = new Map();
    for (const token of text.split(/\s+/)) {
      if (!token || token.startsWith("!") || token.includes("${")) continue;
      const { variant, utility } = variantOf(token);
      const group = byVariant.get(variant) ?? { edge: null, shadows: [] };
      if (EDGE.test(utility)) group.edge = token;
      else if (SHADOW.test(utility)) group.shadows.push(token);
      byVariant.set(variant, group);
    }
    const line = source.slice(0, match.index).split("\n").length;
    for (const { edge, shadows } of byVariant.values()) {
      for (const shadow of edge ? shadows : []) {
        found.push(
          `${file}:${line}: ${shadow} never draws beside ${edge}, which owns box-shadow; use edge-drop for a hairline with a drop, or drop the shadow (#1121)`,
        );
      }
    }
  }
  return found;
}

/** Custom properties Base UI sets on its parts at run time. */
const RUNTIME_PROPERTIES =
  /^--(?:anchor-|available-|drawer-|nested-drawers|toast-|transform-origin|popup-|positioner-)/;

/** Every custom property a stylesheet, a style object or a Tailwind arbitrary property defines. */
export function definedProperties(source) {
  const defined = new Set();
  for (const m of source.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);
  for (const m of source.matchAll(/["'](--[\w-]+)["']\s*[:\]]/g)) defined.add(m[1]);
  for (const m of source.matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)) defined.add(m[1]);
  return defined;
}

/** A property read with no fallback and no definition in its app resolves to nothing, so the style is dropped (#1121). */
export function propertyProblems(file, source, defined) {
  const found = [];
  for (const m of source.matchAll(/(?:var\(|\()\s*(--[\w-]+)\s*([,)])?/g)) {
    const [, name, next] = m;
    if (next === "," || defined.has(name) || RUNTIME_PROPERTIES.test(name)) continue;
    const line = source.slice(0, m.index).split("\n").length;
    found.push(
      `${file}:${line}: ${name} is not defined for this app, so this style draws nothing; define it in its stylesheet or packages/design/tokens.css (#1121)`,
    );
  }
  return found;
}

const STORAGE = /\b(?:localStorage|sessionStorage|createMMKV)\b/;

/**
 * A storage key spelled out in two files drifts: renaming it in one leaves sign-out clearing the
 * old key, and the next account on that device resumes this one's state (#1124).
 */
export function storageKeyProblems(sources) {
  const files = new Map();
  for (const [file, source] of sources) {
    if (!STORAGE.test(source)) continue;
    for (const m of source.matchAll(/["'`](lymi-[a-z0-9-]+)["'`]/g)) {
      const seen = files.get(m[1]) ?? new Set();
      seen.add(file);
      files.set(m[1], seen);
    }
  }
  return [...files]
    .filter(([, seen]) => seen.size > 1)
    .map(
      ([key, seen]) =>
        `storage key ${key} is written out in ${[...seen].join(" and ")}; export it from one module and import it (#1124)`,
    );
}

function tracked(...paths) {
  return execFileSync("git", ["ls-files", "--", ...paths], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((file) => file && !SKIPPED.test(file) && existsSync(resolve(root, file)));
}

const read = (file) => readFileSync(resolve(root, file), "utf8");

export function check() {
  const problems = [];

  for (const file of tracked("apps/*/src/*", "apps/mobile/store").filter((f) =>
    /\.(tsx?|astro|mdx?|json|txt)$/.test(f),
  ))
    problems.push(...claimProblems(file, read(file)));

  const apps = {
    "apps/web/src/client": "apps/web/node_modules/tailwindcss/theme.css",
    "apps/site/src": "apps/site/node_modules/tailwindcss/theme.css",
  };
  const design = tracked("packages/design").filter((f) => f.endsWith(".css"));
  for (const [dir, theme] of Object.entries(apps)) {
    const files = tracked(dir).filter((f) => /\.(tsx?|astro|css)$/.test(f));
    const defined = new Set();
    for (const file of [...design, ...files, theme]) {
      for (const name of definedProperties(read(file))) defined.add(name);
    }
    for (const file of files) {
      const source = read(file);
      problems.push(...shadowProblems(file, source), ...propertyProblems(file, source, defined));
    }
  }

  for (const dir of ["apps/web/src/client", "apps/mobile/src", "packages/client/src"]) {
    const sources = tracked(dir)
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => [f, read(f)]);
    problems.push(...storageKeyProblems(sources));
  }

  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = check();
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error(
      `\n${problems.length} known bug pattern(s); each line names the pull request that found it.`,
    );
    process.exit(1);
  }
}
