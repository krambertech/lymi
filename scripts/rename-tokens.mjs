#!/usr/bin/env node

// Renames the colour tokens to the naming grammar in docs/design/system/colour.md across tracked files.
// Rerunnable: a branch opened before the rename runs `node scripts/rename-tokens.mjs` after rebasing.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const RENAMED = {
  text: "ink",
  "text-2": "ink-secondary",
  muted: "ink-muted",
  faint: "ink-faint",
  hover: "plate-hover",
  chosen: "plate-chosen",
  "plate-2": "plate-nested",
  "edge-2": "edge-strong",
  good: "success",
  "good-soft": "success-soft",
  glass: "lantern-glass",
  "glass-unlit": "lantern-glass-unlit",
  metal: "lantern-metal",
  "flame-core": "lantern-flame",
  glow: "lantern-glow",
  pool: "lantern-pool",
  "light-1": "lit-low",
  "light-2": "lit-high",
};

const UTILITY =
  "bg|text|border|border-[xytbselr]|divide|outline|ring|ring-offset|inset-ring|fill|stroke|from|via|to|decoration|caret|accent|placeholder|shadow|inset-shadow";
const alternatives = (list) => list.sort((a, b) => b.length - a.length).join("|");
// The numbered names are distinctive anywhere; the rest also name lantern parts and ordinary words.
const DISTINCT = ["text-2", "plate-2", "edge-2"];
const NUMBERED = alternatives([...DISTINCT]);
const NAMED = alternatives(Object.keys(RENAMED).filter((name) => !DISTINCT.includes(name)));
const KEY = /^[a-z]+$/;

const anywhere = new RegExp(String.raw`(?<!\w)(${NUMBERED})(?![\w-])`, "g");
const property = new RegExp(String.raw`(?<![\w-])--(color-)?(${NAMED})(?![\w-])`, "g");
const utility = new RegExp(String.raw`(?<![\w-])(${UTILITY})-(${NAMED})(?![\w-])`, "g");
// text, good, hover, glass and glow in backticks also name a field, a grade, a state or a utility.
const QUOTED = alternatives(
  Object.keys(RENAMED).filter(
    (name) => !DISTINCT.includes(name) && !/^(text|good|hover|glass|glow)$/.test(name),
  ),
);
const quoted = new RegExp(String.raw`(?<=\x60)(${QUOTED})(?=\x60)`, "g");
const paletteDot = new RegExp(
  String.raw`(?<![\w.])(p|palette\.(?:light|dark))\.(${NAMED})\b(?!\s*\()`,
  "g",
);
const paletteIndex = new RegExp(
  String.raw`(?<![\w.])(p|palette\.(?:light|dark))\["(${NAMED})"\]`,
  "g",
);

const access = (owner, name) =>
  KEY.test(RENAMED[name]) ? `${owner}.${RENAMED[name]}` : `${owner}["${RENAMED[name]}"]`;

const RULES = [
  { pattern: anywhere, replace: (_, name) => RENAMED[name] },
  { pattern: property, replace: (_, color = "", name) => `--${color}${RENAMED[name]}` },
  { pattern: utility, replace: (_, prefix, name) => `${prefix}-${RENAMED[name]}` },
  // In docs, a name in backticks is the token.
  { pattern: quoted, replace: (_, name) => RENAMED[name], files: /\.mdx?$/ },
  // Only the phone and its share extension read the palette as `p`.
  {
    pattern: paletteDot,
    replace: (_, owner, name) => access(owner, name),
    files: /^apps\/mobile\//,
  },
  {
    pattern: paletteIndex,
    replace: (_, owner, name) => access(owner, name),
    files: /^apps\/mobile\//,
  },
];

const applies = (rule, file) => !rule.files || rule.files.test(file);

/** The file's source with every old token name replaced; already renamed names stay as they are. */
export function renameTokens(source, file = "") {
  return RULES.filter((rule) => applies(rule, file)).reduce(
    (text, { pattern, replace }) => text.replace(pattern, replace),
    source,
  );
}

/** Each old token name in a line of a file, with the name that replaces it. */
export function oldTokens(line, file = "") {
  return RULES.filter((rule) => applies(rule, file)).flatMap(({ pattern, replace }) =>
    [...line.matchAll(pattern)].map((match) => ({ found: match[0], fix: replace(...match) })),
  );
}

const EDITED = /\.(tsx?|mts|mjs|jsx?|astro|css|html|mdx?)$/;
const SKIPPED =
  /(^|\/)(node_modules|locales|migrations|contract|runs)\/|\.gen\.|uniwind\.gen\.css$|^scripts\/rename-tokens\.(test\.)?mjs$/;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const listed = spawnSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  if (listed.status !== 0) {
    console.error("rename-tokens: could not list tracked files");
    process.exit(1);
  }
  let changed = 0;
  for (const file of listed.stdout.split("\n")) {
    if (!EDITED.test(file) || SKIPPED.test(file)) continue;
    const path = resolve(root, file);
    const before = readFileSync(path, "utf8");
    const after = renameTokens(before, file);
    if (after === before) continue;
    writeFileSync(path, after);
    changed++;
  }
  console.log(`rename-tokens: renamed tokens in ${changed} files`);
  console.log("Then run: node scripts/check-design-docs.mjs --write");
}
