#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(root, "apps/web");
const state = resolve(web, ".wrangler/e2e");
const expectedParent = resolve(web, ".wrangler");

if (dirname(state) !== expectedParent) {
  throw new Error(`Refusing to clear unexpected E2E state path: ${state}`);
}

rmSync(state, { recursive: true, force: true });

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const migration = spawnSync(
  pnpm,
  [
    "exec",
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "lymi",
    "--local",
    "--persist-to",
    ".wrangler/e2e",
  ],
  { cwd: web, env: { ...process.env, CI: "true" }, stdio: "inherit" },
);

if (migration.status !== 0) process.exit(migration.status ?? 1);

const server = spawn(
  pnpm,
  ["exec", "vite", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    cwd: web,
    env: { ...process.env, LYMI_E2E: "1" },
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
