#!/usr/bin/env node

// The push gate: static checks on everything, tests for what changed against `origin/main`,
// component tests on desktop Chromium only. `pnpm verify` remains the full gate. docs/testing.md.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { sep } from "node:path";
import { pathToFileURL } from "node:url";
import { requiresWorkersTests, runsEverything, selectComponentInstances } from "./test-plan.mjs";

const routeTree = "apps/web/src/client/routeTree.gen.ts";
const routes = "apps/web/src/client/routes";

/** The route tree is git-ignored, so a branch switch that adds or removes a route leaves it stale. */
export function routeTreeIsCurrent(tree = routeTree, dir = routes) {
  if (!existsSync(tree)) return false;
  const imported = new Set(
    [...readFileSync(tree, "utf8").matchAll(/from '\.\/routes\/([^']+)'/g)].map(
      (match) => match[1],
    ),
  );
  // The generator skips files and folders that start with `-`, and tests.
  const files = readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((path) => path.split(sep).join("/"))
    .filter((path) => /\.tsx?$/.test(path) && !/(^|\/)-|\.test\./.test(path))
    .map((path) => path.replace(/\.tsx?$/, ""));
  return files.length === imported.size && files.every((file) => imported.has(file));
}

export function changedPaths(git = (args) => execFileSync("git", args, { encoding: "utf8" })) {
  const base = git(["merge-base", "origin/main", "HEAD"]).trim();
  const committed = git(["diff", "--name-only", base]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const paths = [...new Set(`${committed}\n${untracked}`.split("\n").filter(Boolean))];
  return { base, paths };
}

export function planSteps({ base, paths, routeTreeCurrent }) {
  if (paths.length === 0) return [];

  if (runsEverything(paths)) {
    return [
      {
        label: "everything: the change reaches configuration the tests depend on",
        args: ["verify"],
      },
    ];
  }

  const instances = selectComponentInstances(paths).join(",");
  const vitest = (filter) => ({
    label: `tests changed against origin/main in ${filter}`,
    args: ["--filter", filter, "exec", "vitest", "run", "--changed", base, "--passWithNoTests"],
    env: { LYMI_COMPONENT_INSTANCES: instances },
  });

  return [
    { label: "formatting and lint", args: ["check"] },
    { label: "interface strings", args: ["i18n:check"] },
    { label: "migration safety", args: ["check:migrations"] },
    // Typechecking needs a current route tree, which the build writes.
    ...(routeTreeCurrent
      ? []
      : [{ label: "product build", args: ["--filter", "@lymi/web", "build"] }]),
    { label: "TypeScript", args: ["typecheck"] },
    vitest("@lymi/core"),
    vitest("@lymi/client"),
    vitest("@lymi/design"),
    vitest("@lymi/web"),
    vitest("@lymi/site"),
    vitest("@lymi/mobile"),
    ...(requiresWorkersTests(paths)
      ? [{ label: "Workers-runtime tests", args: ["--filter", "@lymi/web", "test:workers"] }]
      : []),
    ...(paths.some((path) => path.startsWith("scripts/"))
      ? [{ label: "script tests", command: "node", args: ["--test", "scripts/*.test.mjs"] }]
      : []),
  ];
}

function run(step) {
  process.stdout.write(`\n> ${step.label}\n`);
  const result = spawnSync(step.command ?? "pnpm", step.args, {
    stdio: "inherit",
    env: { ...process.env, ...step.env },
  });
  if (result.status !== 0) {
    process.stderr.write(`\nverify:changed failed at: ${step.label}\n`);
    process.exit(result.status ?? 1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { base, paths } = changedPaths();
  const steps = planSteps({ base, paths, routeTreeCurrent: routeTreeIsCurrent() });
  process.stdout.write(
    steps.length === 0
      ? "Nothing changed against origin/main; nothing to verify.\n"
      : `${paths.length} changed path(s) against origin/main.\n`,
  );
  for (const step of steps) run(step);
}
