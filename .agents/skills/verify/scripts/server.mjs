#!/usr/bin/env node

// Start the product for a verification run, or stop the one this script started and nothing else.

import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const web = resolve(root, "apps/web");
const record = resolve(web, ".wrangler/verify-server.json");

const HELP = `Usage: node .agents/skills/verify/scripts/server.mjs <start|stop>

  start   Create .dev.vars if missing, migrate the local D1, start the product on 5241 or
          the next free port, and wait for /api/health. Prints the origin.
  stop    Stop the server start launched, by the process group it recorded.
`;

function freeOn(port, host) {
  return new Promise((done) => {
    const probe = createServer()
      // A machine without IPv6 cannot bind ::1, so nothing else can hold the port there either.
      .once("error", (error) => done(["EADDRNOTAVAIL", "EAFNOSUPPORT"].includes(error.code)))
      .once("listening", () => probe.close(() => done(true)))
      .listen(port, host);
  });
}

// Vite's `localhost` can resolve to ::1 alone, so a port held there is still taken.
async function free(port) {
  return (await freeOn(port, "127.0.0.1")) && (await freeOn(port, "::1"));
}

function devVars(port) {
  const file = resolve(web, ".dev.vars");
  if (existsSync(file)) return;
  const text = readFileSync(resolve(web, ".dev.vars.example"), "utf8")
    .replace(/^(PUBLIC_SITE_URL|PRODUCT_URL)=.*$/gm, `$1=http://localhost:${port}`)
    .replace(/^BETTER_AUTH_SECRET=.*$/m, `BETTER_AUTH_SECRET=${randomBytes(24).toString("hex")}`);
  writeFileSync(file, text);
  process.stdout.write("Wrote apps/web/.dev.vars from the example.\n");
}

function migrate() {
  const run = (args) => execFileSync("pnpm", args, { cwd: root, stdio: "pipe" });
  try {
    run(["db:migrate"]);
  } catch {
    process.stdout.write("Migrations failed against the local D1; rebuilding it.\n");
    run(["local", "db:fresh"]);
  }
}

async function start() {
  if (existsSync(record)) {
    const { url } = JSON.parse(readFileSync(record, "utf8"));
    process.stdout.write(`Already started: ${url}. Stop it first.\n`);
    return;
  }
  migrate();
  let port = 5241;
  while (!(await free(port))) port += 1;
  devVars(port);
  const url = `http://localhost:${port}`;
  mkdirSync(dirname(record), { recursive: true });
  const logFile = resolve(web, ".wrangler/verify-server.log");
  const log = openSync(logFile, "w");
  const child = spawn(
    "pnpm",
    ["--filter", "@lymi/web", "dev", "--port", String(port), "--strictPort"],
    { cwd: root, detached: true, stdio: ["ignore", log, log] },
  );
  let exited = null;
  child.once("exit", (code, signal) => {
    exited = signal ?? `code ${code}`;
  });
  child.unref();
  writeFileSync(record, `${JSON.stringify({ pid: child.pid, url })}\n`);
  const bound = new RegExp(`Local:\\s+\\S+:${port}/`);
  for (let i = 0; i < 120; i += 1) {
    // Until Vite reports binding the port, or once it is gone, whatever answers is someone else's.
    const output = stripVTControlCharacters(readFileSync(logFile, "utf8"));
    if (exited) {
      rmSync(record);
      const tail = output.trim().split("\n").slice(-20).join("\n");
      throw new Error(`The server exited (${exited}) before ${url} was healthy:\n${tail}`);
    }
    if (bound.test(output)) {
      try {
        const health = await fetch(`${url}/api/health`).then((r) => r.json());
        if (health.name === "lymi-product") {
          process.stdout.write(`${url}\n`);
          return;
        }
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`No answer from ${url}; see apps/web/.wrangler/verify-server.log`);
}

function stop() {
  if (!existsSync(record)) {
    process.stdout.write("Nothing to stop: this script started no server here.\n");
    return;
  }
  const { pid, url } = JSON.parse(readFileSync(record, "utf8"));
  try {
    process.kill(-pid, "SIGTERM");
  } catch {}
  rmSync(record);
  process.stdout.write(`Stopped ${url}.\n`);
}

const command = process.argv[2];
if (command === "start") await start();
else if (command === "stop") stop();
else process.stdout.write(HELP);
