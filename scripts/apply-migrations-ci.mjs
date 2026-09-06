#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const retryDelays = [2_000, 4_000];

function runWrangler() {
  return spawnSync("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", "lymi", "--remote"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function applyMigrations({
  run = runWrangler,
  pause = wait,
  delays = retryDelays,
  report = (message) => process.stderr.write(`${message}\n`),
} = {}) {
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    const result = run();
    if (result.status === 0) return;
    if (attempt === delays.length) {
      throw new Error(
        `Remote D1 migrations failed after ${attempt + 1} attempts (exit ${result.status ?? "unknown"})`,
      );
    }

    const delay = delays[attempt];
    report(
      `Remote D1 migration attempt ${attempt + 1} failed; retrying in ${delay / 1_000}s in case another Worker build is applying the same migration.`,
    );
    await pause(delay);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await applyMigrations();
}
