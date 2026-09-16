#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { e2eAllowedEmails, e2eOperatorEmails } from "../e2e/settings.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(root, "apps/web");
const site = resolve(root, "apps/site");
const state = resolve(web, ".wrangler/e2e");
const productPackageState = resolve(web, ".wrangler/e2e-product-package");
const siteState = resolve(site, ".wrangler/e2e");
const expectedParent = resolve(web, ".wrangler");
const expectedSiteParent = resolve(site, ".wrangler");
const cloudflareEnv = "lymi-e2e";
const devVars = resolve(web, `.dev.vars.${cloudflareEnv}`);
const productPackageConfig = resolve(web, "dist/lymi/wrangler.e2e.json");
const productPackageDevVars = resolve(web, "dist/lymi/.dev.vars");
const requireFromWeb = createRequire(resolve(web, "package.json"));

function packageBin(name, bin) {
  return resolve(dirname(requireFromWeb.resolve(`${name}/package.json`)), bin);
}

if (dirname(state) !== expectedParent) {
  throw new Error(`Refusing to clear unexpected E2E state path: ${state}`);
}
if (dirname(siteState) !== expectedSiteParent) {
  throw new Error(`Refusing to clear unexpected E2E state path: ${siteState}`);
}
if (dirname(productPackageState) !== expectedParent) {
  throw new Error(`Refusing to clear unexpected product-package E2E path: ${productPackageState}`);
}

rmSync(state, { recursive: true, force: true });
rmSync(siteState, { recursive: true, force: true });
rmSync(productPackageState, { recursive: true, force: true });
mkdirSync(productPackageState, { recursive: true });

// Cloudflare gives .dev.vars.<environment> precedence over .dev.vars. Use a unique,
// short-lived environment so ignored developer secrets and allowlists cannot affect E2E.
const testVars = [
  "PUBLIC_SITE_URL=http://localhost:4174",
  "PRODUCT_URL=http://localhost:4173",
  `ALLOWED_EMAILS=${e2eAllowedEmails.join(",")}`,
  `OPERATOR_EMAILS=${e2eOperatorEmails.join(",")}`,
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
  rmSync(productPackageConfig, { force: true });
  rmSync(productPackageDevVars, { force: true });
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

const siteMigration = spawnSync(
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
  { cwd: site, env: { ...process.env, CI: "true" }, stdio: "inherit" },
);

if (siteMigration.status !== 0) {
  cleanup();
  process.exit(siteMigration.status ?? 1);
}

// Published decks for the public pages. The site keeps its own local D1: two local runtimes
// sharing one crash on SQLITE_BUSY (cloudflare/workers-sdk#14916).
const siteFixture = spawnSync(
  pnpm,
  [
    "exec",
    "wrangler",
    "d1",
    "execute",
    "lymi",
    "--local",
    "--persist-to",
    ".wrangler/e2e",
    "--file",
    resolve(root, "e2e/fixtures/published-decks.sql"),
  ],
  { cwd: site, env: { ...process.env, CI: "true" }, stdio: "inherit" },
);

if (siteFixture.status !== 0) {
  cleanup();
  process.exit(siteFixture.status ?? 1);
}

const siteBuild = spawnSync(pnpm, ["run", "build"], {
  cwd: site,
  env: {
    ...process.env,
    PUBLIC_PRODUCT_URL: "http://localhost:4173",
    PUBLIC_SITE_URL: "http://localhost:4174",
  },
  stdio: "inherit",
});

if (siteBuild.status !== 0) {
  cleanup();
  process.exit(siteBuild.status ?? 1);
}

const productBuild = spawnSync(pnpm, ["run", "build"], {
  cwd: web,
  env: process.env,
  stdio: "inherit",
});

if (productBuild.status !== 0) {
  cleanup();
  process.exit(productBuild.status ?? 1);
}

const productMigration = spawnSync(
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
    ".wrangler/e2e-product-package",
  ],
  { cwd: web, env: { ...process.env, CI: "true" }, stdio: "inherit" },
);

if (productMigration.status !== 0) {
  cleanup();
  process.exit(productMigration.status ?? 1);
}

const generatedProductDirectory = resolve(web, "dist/lymi");
const generatedProductConfig = JSON.parse(
  readFileSync(resolve(generatedProductDirectory, "wrangler.json"), "utf8"),
);
// The generated file carries its source config paths as metadata. A local smoke-test config must
// stand alone beside the built entry point, otherwise Wrangler silently reloads production vars.
delete generatedProductConfig.configPath;
delete generatedProductConfig.userConfigPath;
generatedProductConfig.vars = {
  ...generatedProductConfig.vars,
  PUBLIC_SITE_URL: "http://localhost:4174",
  PRODUCT_URL: "http://localhost:4175",
  ALLOWED_EMAILS: e2eAllowedEmails.join(","),
  OPERATOR_EMAILS: e2eOperatorEmails.join(","),
};
generatedProductConfig.routes = [];
writeFileSync(productPackageConfig, JSON.stringify(generatedProductConfig));
writeFileSync(
  productPackageDevVars,
  [
    "PUBLIC_SITE_URL=http://localhost:4174",
    "PRODUCT_URL=http://localhost:4175",
    `ALLOWED_EMAILS=${e2eAllowedEmails.join(",")}`,
    `OPERATOR_EMAILS=${e2eOperatorEmails.join(",")}`,
    "BETTER_AUTH_SECRET=lymi-e2e-secret-at-least-thirty-two-characters",
    "GOOGLE_CLIENT_ID=e2e-client-id",
    "GOOGLE_CLIENT_SECRET=e2e-client-secret",
    "OPENAI_API_KEY=",
    "",
  ].join("\n"),
);

const siteServer = spawn(
  process.execPath,
  [
    packageBin("wrangler", "bin/wrangler.js"),
    "dev",
    "--ip",
    "127.0.0.1",
    "--port",
    "4174",
    "--persist-to",
    ".wrangler/e2e",
  ],
  { cwd: site, env: process.env, stdio: "inherit" },
);

siteServer.on("error", (error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});

async function waitFor(url) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

await waitFor("http://127.0.0.1:4174/api/health");

const productPackageServer = spawn(
  process.execPath,
  [
    packageBin("wrangler", "bin/wrangler.js"),
    "dev",
    "--config",
    productPackageConfig,
    "--ip",
    "127.0.0.1",
    "--port",
    "4175",
    "--persist-to",
    productPackageState,
  ],
  { cwd: web, env: process.env, stdio: "inherit" },
);

productPackageServer.on("error", (error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});

await waitFor("http://localhost:4175/api/health");

const productServer = spawn(
  process.execPath,
  [packageBin("vite", "bin/vite.js"), "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    cwd: web,
    env: { ...process.env, CLOUDFLARE_ENV: cloudflareEnv, LYMI_E2E: "1" },
    stdio: "inherit",
  },
);

productServer.on("error", (error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanup();
    siteServer.kill(signal);
    productPackageServer.kill(signal);
    productServer.kill(signal);
  });
}

productServer.on("exit", (code, signal) => {
  cleanup();
  siteServer.kill("SIGTERM");
  productPackageServer.kill("SIGTERM");
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
