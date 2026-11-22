#!/usr/bin/env node

// Fails when a production module exports a name that only tests read (#1266); docs/testing.md
// names it under "Bugs a pattern can catch". Usage: node scripts/check-test-only-exports.mjs

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Modules that export; Astro, MDX, JSON and generated files, such as wrangler.jsonc, only read. */
const MODULE = /\.[cm]?[jt]sx?$/;
const READER = /\.(?:[cm]?[jt]sx?|astro|mdx|jsonc?)$/;
const GENERATED = /\.gen\./;
const SKIPPED = /\.d\.[cm]?ts$|\/locales\/|(?:^|\/)(?:dist|build|\.expo)\//;

/** Tests, and the harness only tests load: setup, fixtures, helpers and runner config. */
const TEST =
  /\.(?:test|spec)\.|(?:^|\/)(?:e2e|test|tests|__tests__)\/|^apps\/web\/src\/server\/(?:[^/]+\/)*test-[^/]+$|(?:^|\/)(?:vitest|playwright)[^/]*\.config\.|^apps\/site\/src\/lib\/learn\/checks\//;

/**
 * Exports that only tests read and that stay, each with its reason: a reset that stands in for a
 * restart a test proves something survives, or a check whose only runner is a test.
 */
export const ALLOWED = new Map([
  [
    "packages/client/src/writes.ts#resetWriteCache",
    "stands in for an app restart, so a test proves the write outbox survives one",
  ],
  [
    "packages/client/src/grades.ts#resetGradeCache",
    "stands in for an app restart, so a test proves queued grades survive one",
  ],
  [
    "packages/client/src/update-required.ts#resetUpdateRequired",
    "stands in for a relaunch, which clears the update-required flag",
  ],
  [
    "apps/web/src/server/services/email.ts#clearLocalEmailOutbox",
    "stands in for a restart of the local Worker, which empties the in-memory outbox",
  ],
  [
    "apps/web/src/server/enrichment/recorded-run.ts#languagePassRates",
    "the enrichment gate on enrichByDefault, which runs as recorded-run.test.ts",
  ],
  [
    "apps/web/src/server/enrichment/recorded-run.ts#enrichesByDefault",
    "the enrichment gate on enrichByDefault, which runs as recorded-run.test.ts",
  ],
  [
    "apps/web/src/server/enrichment/recorded-run.ts#regressions",
    "the recorded runs' regression gate, which runs as recorded-run.test.ts",
  ],
  [
    "packages/core/src/scheduler-snapshot/snapshot.ts#differences",
    "the schedule snapshot comparison, which runs as fsrs.differential.test.ts",
  ],
  [
    "scripts/api-compat.mjs#closedChoices",
    "the phone contract's open-list check, which runs as phone-contract.test.ts",
  ],
  [
    "scripts/request-bounds.mjs#unboundedParts",
    "the request limits check, which runs as request-bounds.test.ts",
  ],
]);

const DECLARATION =
  /^[ \t]*export[ \t]+(?:declare[ \t]+)?(?:async[ \t]+)?(?:function\*?|class|abstract[ \t]+class|const[ \t]+enum|enum|interface|type|const|let|var)[ \t]+([A-Za-z_$][\w$]*)/gm;
const LOCAL_LIST = /^[ \t]*export[ \t]+(?:type[ \t]+)?\{([^}]*)\}(?![ \t]*from)/gm;
/** A re-export names a symbol without using it, so it is not a reader. */
const RE_EXPORT =
  /^[ \t]*export[ \t]+(?:type[ \t]+)?(?:\*(?:[ \t]+as[ \t]+[\w$]+)?|\{[^}]*\})[ \t]+from[ \t]+["'][^"']+["'];?/gm;
const NAMED_RE_EXPORT = /^[ \t]*export[ \t]+(?:type[ \t]+)?\{([^}]*)\}[ \t]+from[ \t]/gm;
/** A whole word: not part of a path such as check-regressions.mjs or a key such as check:regressions. */
const IDENTIFIER = /(?<![\w$:-])[A-Za-z_$][\w$]*(?![\w$-])/g;
/** Block comments and line comments that open a line or follow a space, so a URL's // stays. */
const COMMENT = /(^|\s)\/\*[\s\S]*?\*\/|(^|[\s;{}(),])\/\/[^\n]*/gm;

function wordsOf(source) {
  return source.replace(COMMENT, "$1$2").match(IDENTIFIER) ?? [];
}

function count(words, name) {
  let n = 0;
  for (const word of words) if (word === name) n++;
  return n;
}

/** The names a module exports, each with how many times the module itself uses it. */
export function exportsOf(source) {
  const words = wordsOf(source);
  const listed = new Map();
  for (const m of source.matchAll(LOCAL_LIST)) {
    for (const part of m[1].split(",")) {
      const [local, exported = local] = part
        .replace(/^\s*type\s+/, "")
        .split(/\s+as\s+/)
        .map((s) => s.trim());
      if (local && exported !== "default") listed.set(exported, local);
    }
  }
  const found = new Map();
  for (const m of source.matchAll(DECLARATION)) found.set(m[1], count(words, m[1]) - 1);
  for (const m of source.matchAll(NAMED_RE_EXPORT)) {
    for (const part of m[1].split(",")) {
      const name = part
        .replace(/^\s*type\s+/, "")
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim();
      if (name && name !== "default" && !found.has(name)) found.set(name, 0);
    }
  }
  for (const [exported, local] of listed) {
    // The declaration and the export list each name the local once.
    found.set(exported, count(words, local) - 2);
  }
  return found;
}

/**
 * Lists every export of a production file that no other production file names and some test does,
 * unless the module uses it itself: a pure helper exported for its unit test is fine.
 */
export function testOnlyExports(sources, allowed = ALLOWED) {
  const readers = new Map();
  for (const [file, source] of sources) {
    const words = new Set(wordsOf(source.replace(RE_EXPORT, "")));
    // A barrel that renames an export hands its readers to the new name, so it reads the old one.
    for (const m of source.matchAll(NAMED_RE_EXPORT)) {
      for (const part of m[1].split(",")) {
        const [local, exported] = part
          .replace(/^\s*type\s+/, "")
          .split(/\s+as\s+/)
          .map((s) => s.trim());
        if (local && exported && local !== exported) words.add(local);
      }
    }
    for (const word of words) {
      const files = readers.get(word) ?? [];
      files.push(file);
      readers.set(word, files);
    }
  }
  const problems = [];
  const used = new Set();
  for (const [file, source] of sources) {
    if (TEST.test(file) || !MODULE.test(file) || GENERATED.test(file)) continue;
    for (const [name, own] of exportsOf(source)) {
      if (own > 0) continue;
      const others = (readers.get(name) ?? []).filter((f) => f !== file);
      if (others.length === 0 || others.some((f) => !TEST.test(f))) continue;
      const key = `${file}#${name}`;
      if (allowed.has(key)) {
        used.add(key);
        continue;
      }
      problems.push(
        `${file}: only tests read ${name} (${others.join(", ")}); test through the module's public API, move it beside the tests, or delete it. If it must stay, add it to ALLOWED in scripts/check-test-only-exports.mjs with its reason (#1266)`,
      );
    }
  }
  for (const key of allowed.keys()) {
    if (!used.has(key))
      problems.push(
        `${key} is in ALLOWED but production reads it or it is gone; take it off the list`,
      );
  }
  return problems;
}

export function check() {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        READER.test(file) &&
        !SKIPPED.test(file) &&
        !file.includes("node_modules/") &&
        // ALLOWED spells out the names it allows, which would read as uses.
        file !== "scripts/check-test-only-exports.mjs" &&
        existsSync(resolve(root, file)),
    );
  return testOnlyExports(files.map((file) => [file, readFileSync(resolve(root, file), "utf8")]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = check();
  for (const problem of problems) console.error(problem);
  if (problems.length > 0) {
    console.error(
      `\n${problems.length} export(s) only tests read; docs/testing.md#bugs-a-pattern-can-catch says why.`,
    );
    process.exitCode = 1;
  }
}
