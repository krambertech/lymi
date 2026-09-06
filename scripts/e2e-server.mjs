#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { e2eAllowedEmails } from "../e2e/settings.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(root, "apps/web");
const state = resolve(web, ".wrangler/e2e");
const expectedParent = resolve(web, ".wrangler");
const cloudflareEnv = "lymi-e2e";
const devVars = resolve(web, `.dev.vars.${cloudflareEnv}`);

if (dirname(state) !== expectedParent) {
  throw new Error(`Refusing to clear unexpected E2E state path: ${state}`);
}

rmSync(state, { recursive: true, force: true });

// Cloudflare gives .dev.vars.<environment> precedence over .dev.vars. Use a unique,
// short-lived environment so ignored developer secrets and allowlists cannot affect E2E.
const testVars = [
  "PUBLIC_SITE_URL=http://localhost:4173",
  "PRODUCT_URL=http://localhost:4173",
  `ALLOWED_EMAILS=${e2eAllowedEmails.join(",")}`,
  "BETTER_AUTH_SECRET=lymi-e2e-secret-at-least-thirty-two-characters",
  "GOOGLE_CLIENT_ID=e2e-client-id",
  "GOOGLE_CLIENT_SECRET=e2e-client-secret",
  "OPENAI_API_KEY=",
  "",
].join("\n");
const devVarsExisted = existsSync(devVars);
if (devVarsExisted && readFileSync(devVars, "utf8") !== testVars) {
  throw new Error(`Refusing to overwrite unexpected E2E variables file: ${devVars}`);
}
if (!devVarsExisted) writeFileSync(devVars, testVars);

const cleanup = () => {
  if (!devVarsExisted) rmSync(devVars, { force: true });
};
process.on("exit", cleanup);

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

if (migration.status !== 0) {
  cleanup();
  process.exit(migration.status ?? 1);
}

const server = spawn(
  pnpm,
  ["exec", "vite", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    cwd: web,
    env: { ...process.env, CLOUDFLARE_ENV: cloudflareEnv, LYMI_E2E: "1" },
    stdio: "inherit",
  },
);

server.on("error", (error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanup();
    server.kill(signal);
  });
}

server.on("exit", (code, signal) => {
  cleanup();
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
