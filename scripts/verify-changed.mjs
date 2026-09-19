#!/usr/bin/env node

// The push gate: static checks on everything, tests for what changed against `origin/main`,
// component tests on desktop Chromium only. `pnpm verify` remains the full gate. docs/testing.md.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { runsEverything, selectComponentInstances } from "./test-plan.mjs";

const routeTree = "apps/web/src/client/routeTree.gen.ts";

export function changedPaths(git = (args) => execFileSync("git", args, { encoding: "utf8" })) {
  const base = git(["merge-base", "origin/main", "HEAD"]).trim();
  const committed = git(["diff", "--name-only", base]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  const paths = [...new Set(`${committed}\n${untracked}`.split("\n").filter(Boolean))];
  return { base, paths };
}

export function planSteps({ base, paths, hasRouteTree }) {
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
    // Typechecking needs the generated route tree, which the build writes in a fresh clone.
    ...(hasRouteTree ? [] : [{ label: "product build", args: ["--filter", "@lymi/web", "build"] }]),
    { label: "TypeScript", args: ["typecheck"] },
    vitest("@lymi/core"),
    vitest("@lymi/web"),
    vitest("@lymi/site"),
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
  const steps = planSteps({ base, paths, hasRouteTree: existsSync(routeTree) });
  process.stdout.write(
    steps.length === 0
      ? "Nothing changed against origin/main; nothing to verify.\n"
      : `${paths.length} changed path(s) against origin/main.\n`,
  );
  for (const step of steps) run(step);
}
