#!/usr/bin/env node

// Start the phone stack for a verification run, or stop the one this script started and nothing else.

import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { connect, createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const web = resolve(root, "apps/web");
const mobile = resolve(root, "apps/mobile");
export const record = resolve(mobile, ".expo/verify-phone.json");
const logs = resolve(mobile, ".expo");
// One Simulator per worktree, named by a hash of its path because many worktrees share a folder name.
export const SIMULATOR = `Lymi verify ${createHash("sha1").update(root).digest("hex").slice(0, 6)}`;

const HELP = `Usage: node .agents/skills/verify-phone/scripts/stack.mjs <start|stop|status>

  start   Migrate the local D1, start the Worker and Metro on free ports, boot the
          "${SIMULATOR}" Simulator by its UDID, and install and open the shared dev client.
  stop    Stop the Worker and Metro start launched, by the process groups it recorded,
          and shut the Simulator down.
  status  Print what start recorded.
`;

/** Nothing answers on either loopback and the wildcard address binds: Metro listens on every address. */
async function free(port) {
  const answers = (host) =>
    new Promise((done) => {
      const socket = connect({ port, host })
        .once("connect", () => {
          socket.destroy();
          done(true);
        })
        .once("error", () => done(false));
    });
  const binds = () =>
    new Promise((done) => {
      const server = createServer()
        .once("error", () => done(false))
        .once("listening", () => server.close(() => done(true)))
        .listen(port);
    });
  return !(await answers("127.0.0.1")) && !(await answers("::1")) && (await binds());
}

async function freePort(from) {
  let port = from;
  while (!(await free(port))) port += 1;
  return port;
}

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

/** This skill's own Simulator, created once and always addressed by UDID. */
function simulator() {
  const list = JSON.parse(xcrun(["simctl", "list", "devices", "available", "--json"]));
  const found = Object.values(list.devices)
    .flat()
    .find((d) => d.name === SIMULATOR);
  if (found) return found.udid;
  const { runtimes } = JSON.parse(xcrun(["simctl", "list", "runtimes", "available", "--json"]));
  const runtime = runtimes.filter((r) => r.platform === "iOS").at(-1);
  return xcrun(["simctl", "create", SIMULATOR, "iPhone 17 Pro", runtime.identifier]).trim();
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

  const workerPort = await freePort(5241);
  const worker = `http://localhost:${workerPort}`;
  const workerPid = launch(
    "worker",
    "pnpm",
    ["--filter", "@lymi/web", "dev", "--port", String(workerPort), "--strictPort"],
    { cwd: root },
  );
  const metroPort = await freePort(8197);
  const metroPid = launch(
    "metro",
    "npx",
    ["expo", "start", "--dev-client", "--port", String(metroPort)],
    { cwd: mobile, env: { ...process.env, EXPO_PUBLIC_API_URL: worker } },
  );
  const udid = simulator();
  writeFileSync(
    record,
    `${JSON.stringify({ udid, worker, workerPid, metroPort, metroPid }, null, 2)}\n`,
  );

  await waitFor(
    "The Worker",
    async () => (await fetch(`${worker}/api/health`).then((r) => r.json())).name === "lymi-product",
    120,
  );
  await waitFor(
    "Metro",
    async () =>
      (await fetch(`http://127.0.0.1:${metroPort}/status`).then((r) => r.text())).includes(
        "packager-status:running",
      ),
    120,
  );
  // dev-client boots the Simulator, installs the cached client and opens it on this Metro.
  try {
    execFileSync("pnpm", ["dev-client", udid, String(metroPort)], {
      cwd: mobile,
      stdio: "inherit",
    });
  } catch (error) {
    // On a loaded Mac simctl openurl can time out after the install; run.mjs opens the app itself.
    xcrun(["simctl", "get_app_container", udid, "app.lymi"]);
    process.stdout.write(
      `The client is installed but did not open: ${error.message.split("\n")[0]}\n`,
    );
  }
  process.stdout.write(`${JSON.stringify(readRecord(), null, 2)}\n`);
}

function stop() {
  const stack = readRecord();
  if (!stack) {
    process.stdout.write("Nothing to stop: this script started nothing here.\n");
    return;
  }
  for (const pid of [stack.workerPid, stack.metroPid]) {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {}
  }
  try {
    xcrun(["simctl", "shutdown", stack.udid]);
  } catch {}
  rmSync(record);
  process.stdout.write(`Stopped ${stack.worker}, Metro on ${stack.metroPort} and ${SIMULATOR}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === "start") await start();
  else if (command === "stop") stop();
  else if (command === "status") process.stdout.write(`${JSON.stringify(readRecord(), null, 2)}\n`);
  else process.stdout.write(HELP);
}
