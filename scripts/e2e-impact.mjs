#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const productionPrefixes = [
  "apps/web/migrations/",
  "apps/web/public/",
  "apps/web/src/client/",
  "apps/web/src/server/",
  "apps/site/",
  "e2e/",
  "packages/core/",
];

const nonProductionPrefixes = ["apps/web/src/client/design/", "apps/web/src/client/studio/"];

const productionFiles = new Set([
  ".github/workflows/ci.yml",
  ".github/workflows/e2e-command.yml",
  "apps/web/app.html",
  "apps/web/index.html",
  "apps/web/package.json",
  "apps/web/vite.config.ts",
  "apps/web/wrangler.jsonc",
  // The sheet spec opens a design system frame, so these design files are part of its harness.
  "apps/web/src/client/design/device-frame.tsx",
  "apps/web/src/client/design/forced-states.tsx",
  "apps/web/src/client/design/specimens.tsx",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "scripts/apply-migrations-ci.mjs",
  "scripts/check-deployment.mjs",
  "scripts/check-migrations.mjs",
  "scripts/check-schema-drift.mjs",
  "scripts/migration-manifest.json",
  "scripts/ci-plan.mjs",
  "scripts/ci-summary.mjs",
  "scripts/e2e-impact.mjs",
  "scripts/e2e-shard-outcome.mjs",
  "scripts/e2e-server.mjs",
  "tsconfig.base.json",
]);

export function isTestFile(path) {
  return path.endsWith(".test.ts") || path.endsWith(".test.tsx");
}

export function requiresE2E(paths) {
  return paths.some((path) => {
    if (productionFiles.has(path)) return true;
    if (isTestFile(path)) return false;
    if (nonProductionPrefixes.some((prefix) => path.startsWith(prefix))) return false;
    return productionPrefixes.some((prefix) => path.startsWith(prefix));
  });
}

function readPaths() {
  const input = readFileSync(0, "utf8");
  return input.split(input.includes("\0") ? "\0" : "\n").filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const paths = readPaths();
  const run = requiresE2E(paths);
  const message = `run_e2e=${String(run)}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, message);
  process.stdout.write(
    `E2E ${run ? "required" : "not required"} for ${paths.length} changed file(s).\n`,
  );
}
