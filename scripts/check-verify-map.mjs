#!/usr/bin/env node

// Fails when the verify skill's map in SKILL.md and its features/ folder disagree.
// Usage: node scripts/check-verify-map.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const skillDir = join(root, ".agents/skills/verify");

const named = (files, ext) =>
  new Set(files.filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)));

/** Each disagreement between the map's rows and the feature files, as a line that names the fix. */
export function mapProblems(skill, files) {
  const rows = skill
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .flatMap((line) => [...line.matchAll(/\]\(features\/([\w-]+)\.md\)/g)].map((m) => m[1]));
  const entries = named(files, ".md");
  const recipes = named(files, ".mjs");
  const problems = [];
  for (const name of entries) {
    if (!recipes.has(name))
      problems.push(`features/${name}.md has no recipe: write features/${name}.mjs.`);
  }
  for (const name of recipes) {
    if (!entries.has(name))
      problems.push(`features/${name}.mjs has no entry: write features/${name}.md.`);
  }
  for (const name of new Set([...entries, ...recipes])) {
    const count = rows.filter((row) => row === name).length;
    if (count === 0)
      problems.push(`${name} is not in SKILL.md's map: add a row linking features/${name}.md.`);
    if (count > 1) problems.push(`${name} has ${count} rows in SKILL.md's map: keep one.`);
  }
  for (const name of new Set(rows)) {
    if (!entries.has(name))
      problems.push(`SKILL.md's map links features/${name}.md, which does not exist.`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
  const files = readdirSync(join(skillDir, "features"));
  const problems = mapProblems(skill, files);
  if (problems.length > 0) {
    console.error(
      `The verify skill's map and its features disagree:\n${problems.map((p) => `- ${p}`).join("\n")}`,
    );
    process.exit(1);
  }
  console.log(`The verify map lists all ${named(files, ".mjs").size} features`);
}
