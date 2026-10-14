#!/usr/bin/env node

// Read-only: is the stack stack.mjs recorded this worktree's code, on its own Simulator, signed in as the expected persona?

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { readRecord, root, xcrun } from "./stack.mjs";

export const BUNDLE_ID = "app.lymi";

const HELP = `Usage: node .agents/skills/verify-phone/scripts/doctor.mjs [--persona <id>]

  Checks the Worker, Metro and Simulator that stack.mjs start recorded. With --persona,
  signs that persona in on the Worker and checks /api/dev/state reports it.
`;

/** The working directory of whatever listens on a loopback port. */
function listenerDirectory(port) {
  try {
    const pids = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
    for (const pid of pids) {
      const out = execFileSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { encoding: "utf8" });
      const line = out.split("\n").find((l) => l.startsWith("n"));
      if (line) return line.slice(1);
    }
  } catch {}
  return null;
}

function servedFromHere(port, subdir) {
  const dir = listenerDirectory(port);
  if (!dir) return { ok: false, detail: `nothing listens on port ${port}` };
  const expected = resolve(root, subdir);
  return dir === expected
    ? { ok: true, detail: `port ${port} runs from ${subdir}` }
    : { ok: false, detail: `port ${port} runs from ${dir}, expected ${expected}` };
}

async function checkWorker(worker) {
  let health;
  try {
    health = await fetch(`${worker}/api/health`, { signal: AbortSignal.timeout(15_000) }).then(
      (r) => r.json(),
    );
  } catch {}
  if (health?.name !== "lymi-product") return { ok: false, detail: `${worker} is not Lymi` };
  return servedFromHere(new URL(worker).port, "apps/web");
}

async function checkMetro(port) {
  let status = "";
  try {
    status = await fetch(`http://127.0.0.1:${port}/status`, {
      signal: AbortSignal.timeout(5_000),
    }).then((r) => r.text());
  } catch {}
  if (!status.includes("packager-status:running"))
    return { ok: false, detail: `no Metro on port ${port}` };
  return servedFromHere(port, "apps/mobile");
}

function checkSimulator(udid, simulator) {
  const list = JSON.parse(xcrun(["simctl", "list", "devices", "--json"]));
  const device = Object.values(list.devices)
    .flat()
    .find((d) => d.udid === udid);
  if (!device) return { ok: false, detail: `no Simulator ${udid}` };
  if (device.name !== simulator || device.state !== "Booted")
    return { ok: false, detail: `${device.name} is ${device.state}, expected ${simulator} booted` };
  try {
    xcrun(["simctl", "get_app_container", udid, BUNDLE_ID]);
  } catch {
    return { ok: false, detail: `${simulator} has no ${BUNDLE_ID}; run stack.mjs start again` };
  }
  return { ok: true, detail: `${simulator} (${udid}) booted with ${BUNDLE_ID}` };
}

/** Vite closes idle kept-alive sockets, so a call can meet a closed one (EPIPE); another attempt opens a fresh one. */
export async function request(url, init) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
}

/** Signs the persona in on the Worker and returns its session cookie. */
export async function signIn(worker, persona, { reset = false } = {}) {
  const response = await request(
    `${worker}/api/dev/sign-in?as=${persona}${reset ? "&reset=1" : ""}`,
    {
      method: "POST",
    },
  );
  if (!response.ok) throw new Error(`Dev sign-in answered HTTP ${response.status}`);
  return response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function checkPersona(worker, persona, cookie) {
  const response = await request(`${worker}/api/dev/state`, {
    headers: { cookie, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return { ok: false, detail: `/api/dev/state answered HTTP ${response.status}` };
  const state = await response.json();
  const id = state.persona?.id ?? null;
  const { decks, cards, due, reviews } = state.counts;
  const counts = `${decks} decks, ${cards} cards, ${due} due, ${reviews} reviews`;
  return id === persona
    ? { ok: true, detail: `${id}: ${counts}` }
    : { ok: false, detail: `signed in as ${id ?? state.user.email}, expected ${persona}` };
}

/** Every check, in order; the stack is worth driving only when all pass. */
export async function doctor({ persona, cookie } = {}) {
  const stack = readRecord();
  if (!stack)
    return [{ name: "stack", ok: false, detail: "nothing recorded; run stack.mjs start" }];
  const checks = [
    { name: "worker", ...(await checkWorker(stack.worker)) },
    { name: "metro", ...(await checkMetro(stack.metroPort)) },
    { name: "phone", ...checkSimulator(stack.udid, stack.simulator) },
  ];
  if (persona && checks[0].ok) {
    const session = cookie ?? (await signIn(stack.worker, persona));
    checks.push({ name: "persona", ...(await checkPersona(stack.worker, persona, session)) });
  }
  return checks;
}

export function report(checks, stdout = process.stdout) {
  for (const c of checks)
    stdout.write(`${c.ok ? "ok  " : "FAIL"} ${c.name.padEnd(8)} ${c.detail}\n`);
  return checks.every((c) => c.ok);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: { persona: { type: "string" }, help: { type: "boolean", short: "h" } },
  });
  if (values.help) process.stdout.write(HELP);
  else if (!report(await doctor({ persona: values.persona }))) process.exitCode = 1;
}
