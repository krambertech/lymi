#!/usr/bin/env node

// Start the phone stack for a verification run, or stop the one this script started and nothing else.

import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const web = resolve(root, "apps/web");
const mobile = resolve(root, "apps/mobile");
export const record = resolve(mobile, ".expo/verify-phone.json");
const logs = resolve(mobile, ".expo");

const HELP = `Usage: node .agents/skills/verify-phone/scripts/stack.mjs <start|stop|status>

  start   Migrate the local D1, start the Worker on this worktree's Stim port, then
          Metro and this worktree's Stim Simulator with the cached dev client.
  stop    Stop the Worker start launched, by the process group it recorded, then
          Stim's Metro and Simulator for this worktree.
  status  Print what start recorded.
`;

export function readRecord() {
  return existsSync(record) ? JSON.parse(readFileSync(record, "utf8")) : null;
}

function devVars() {
  const file = resolve(web, ".dev.vars");
  if (existsSync(file)) return;
  const text = readFileSync(resolve(web, ".dev.vars.example"), "utf8")
    .replace(/^(PUBLIC_SITE_URL|PRODUCT_URL)=.*$/gm, "$1=http://localhost:5241")
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

function launch(name, command, args, options) {
  const log = openSync(resolve(logs, `verify-phone-${name}.log`), "w");
  const child = spawn(command, args, { detached: true, stdio: ["ignore", log, log], ...options });
  child.unref();
  return child.pid;
}

async function waitFor(what, probe, seconds) {
  for (let i = 0; i < seconds; i += 1) {
    try {
      if (await probe()) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(
    `${what} did not answer in ${seconds} s; see apps/mobile/.expo/verify-phone-*.log`,
  );
}

export function xcrun(args) {
  return execFileSync("xcrun", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Runs a Stim command in the phone app and returns its one line of JSON facts. */
function stim(args, env) {
  const run = (extra) =>
    execFileSync("pnpm", ["exec", "stim", ...args, ...extra], {
      cwd: mobile,
      encoding: "utf8",
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "inherit"],
    });
  if (args[0] === "ports") return run([]).trim();
  try {
    return JSON.parse(run(["--json"]));
  } catch (error) {
    // A refusal still prints its facts, and a launch that timed out on a loaded Mac names the device it installed on.
    const facts = error.stdout ? JSON.parse(error.stdout) : null;
    if (facts?.udid) return facts;
    throw error;
  }
}

async function start() {
  const existing = readRecord();
  if (existing) {
    process.stdout.write(`Already started: ${JSON.stringify(existing)}. Stop it first.\n`);
    return;
  }
  mkdirSync(logs, { recursive: true });
  devVars();
  migrate();

  const workerPort = stim(["ports", "get", "api"]);
  const worker = `http://localhost:${workerPort}`;
  const workerPid = launch(
    "worker",
    "pnpm",
    ["--filter", "@lymi/web", "dev", "--port", workerPort, "--strictPort"],
    { cwd: root },
  );
  writeFileSync(record, `${JSON.stringify({ worker, workerPid }, null, 2)}\n`);
  await waitFor(
    "The Worker",
    async () => (await fetch(`${worker}/api/health`).then((r) => r.json())).name === "lymi-product",
    120,
  );

  const env = { EXPO_PUBLIC_API_URL: worker };
  // Metro keeps the environment it started with, so one left from another run may point at another Worker.
  if (stim(["start"], env).alreadyRunning) {
    stim(["stop"]);
    stim(["start"], env);
  }
  const phone = stim(["ios"]);
  const { name } = Object.values(JSON.parse(xcrun(["simctl", "list", "devices", "--json"])).devices)
    .flat()
    .find((d) => d.udid === phone.udid);
  writeFileSync(
    record,
    `${JSON.stringify({ udid: phone.udid, simulator: name, worker, workerPid, metroPort: phone.metroPort }, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(readRecord(), null, 2)}\n`);
}

function stop() {
  const stack = readRecord();
  if (!stack) {
    process.stdout.write("Nothing to stop: this script started nothing here.\n");
    return;
  }
  try {
    process.kill(-stack.workerPid, "SIGTERM");
  } catch {}
  stim(["stop"]);
  rmSync(record);
  process.stdout.write(
    `Stopped ${stack.worker}, Metro and ${stack.simulator ?? "the Simulator"}.\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === "start") await start();
  else if (command === "stop") stop();
  else if (command === "status") process.stdout.write(`${JSON.stringify(readRecord(), null, 2)}\n`);
  else process.stdout.write(HELP);
}
