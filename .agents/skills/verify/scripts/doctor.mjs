#!/usr/bin/env node

// Read-only: is the instance at --url this worktree's code, signed in as the expected persona?

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const HELP = `Usage: node .agents/skills/verify/scripts/doctor.mjs [options]

  --url <origin>       Instance to check (default: http://localhost:5241)
  --sha <commit>       Commit it should serve (default: HEAD of this worktree)
  --persona <id>       Persona /api/dev/state should report (default: learner)
  --session <file>     Playwright storage state holding the instance's cookies
`;

function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function isLoopback(url) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
}

/** The working directory of whatever listens on a loopback port, via lsof (macOS and Linux). */
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

async function checkCommit(url, health, sha) {
  const tag = health.version?.tag ?? null;
  if (tag === sha) return { ok: true, detail: `serves ${sha.slice(0, 8)}` };
  if (tag) {
    // A pull-request build is tagged with GitHub's merge of the head into main, not the head.
    git(["fetch", "--quiet", "origin", tag]);
    const parents = git(["rev-list", "--parents", "-n", "1", tag])?.split(" ").slice(1) ?? [];
    if (parents.includes(sha)) {
      return { ok: true, detail: `serves ${tag.slice(0, 8)}, the merge of ${sha.slice(0, 8)}` };
    }
    return { ok: false, detail: `serves ${tag.slice(0, 8)}, expected ${sha.slice(0, 8)}` };
  }
  if (!isLoopback(url)) return { ok: false, detail: "the deployment carries no commit tag" };
  // A local server has no tag; it serves whatever worktree it was started in.
  const port = new URL(url).port || "80";
  const dir = listenerDirectory(port);
  if (!dir) return { ok: false, detail: `nothing found listening on port ${port}` };
  const served = git(["rev-parse", "--show-toplevel"], dir);
  const mine = git(["rev-parse", "--show-toplevel"]);
  if (served !== mine) return { ok: false, detail: `port ${port} serves ${served ?? dir}` };
  const head = git(["rev-parse", "HEAD"]);
  const dirty = git(["status", "--porcelain"]) ? ", with uncommitted changes" : "";
  return { ok: head === sha, detail: `this worktree at ${head?.slice(0, 8)}${dirty}` };
}

function cookieFor(url, sessionFile) {
  if (!sessionFile || !existsSync(sessionFile)) return null;
  const { hostname } = new URL(url);
  const { cookies } = JSON.parse(readFileSync(sessionFile, "utf8"));
  return cookies
    .filter((c) => hostname.endsWith(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function checkPersona(url, persona, cookie) {
  if (!cookie) return { ok: true, skipped: true, detail: "not checked without --session" };
  const response = await fetch(`${url}/api/dev/state`, {
    headers: { cookie, accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return { ok: false, detail: `/api/dev/state answered HTTP ${response.status}` };
  const state = await response.json();
  const id = state.persona?.id ?? null;
  const { decks, cards, due, reviews } = state.counts;
  const counts = `${decks} decks, ${cards} cards, ${due} due, ${reviews} reviews`;
  return id === persona
    ? { ok: true, detail: `${id}: ${counts}`, state }
    : { ok: false, detail: `signed in as ${id ?? state.user.email}, expected ${persona}`, state };
}

/** Every check, in order; the instance is worth driving only when all pass. */
export async function doctor({ url, sha, persona, cookie }) {
  const checks = [];
  let health;
  try {
    const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(15_000) });
    health = response.ok ? await response.json() : null;
  } catch {}
  const healthy = health?.ok === true && health.name === "lymi-product";
  checks.push({ name: "health", ok: healthy, detail: healthy ? url : `${url} is not Lymi` });
  if (!healthy) return checks;
  checks.push({ name: "commit", ...(await checkCommit(url, health, sha)) });
  checks.push({ name: "persona", ...(await checkPersona(url, persona, cookie)) });
  return checks;
}

export function report(checks, stdout = process.stdout) {
  for (const c of checks) {
    const mark = c.skipped ? "skip" : c.ok ? "ok  " : "FAIL";
    stdout.write(`${mark} ${c.name.padEnd(8)} ${c.detail}\n`);
  }
  return checks.every((c) => c.ok);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: "http://localhost:5241" },
      sha: { type: "string" },
      persona: { type: "string", default: "learner" },
      session: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    process.stdout.write(HELP);
  } else {
    const url = values.url.replace(/\/+$/, "");
    const checks = await doctor({
      url,
      sha: values.sha ?? git(["rev-parse", "HEAD"]),
      persona: values.persona,
      cookie: cookieFor(url, values.session),
    });
    if (!report(checks)) process.exitCode = 1;
  }
}

export { cookieFor, git };
