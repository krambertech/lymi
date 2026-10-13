#!/usr/bin/env node

// Drive features from the phone map on the stack stack.mjs started and keep the evidence. See ../SKILL.md.

import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { BUNDLE_ID, doctor, report, request, signIn } from "./doctor.mjs";
import { readRecord, root, xcrun } from "./stack.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const featuresDir = resolve(here, "../features");
const features = readdirSync(featuresDir)
  .filter((f) => f.endsWith(".yaml") && !f.startsWith("_"))
  .map((f) => f.slice(0, -5));

const HELP = `Usage: node .agents/skills/verify-phone/scripts/run.mjs <feature...> [options]

Features: ${features.join(", ")}

  --pr <n>     Pull request the evidence belongs to (default: the branch name)
  --out <dir>  Evidence root (default: /mnt/project-files/evidence, else the temp dir)
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    pr: { type: "string" },
    out: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

const unknown = positionals.filter((f) => !features.includes(f));
if (values.help || positionals.length === 0 || unknown.length > 0) {
  if (unknown.length > 0) process.stderr.write(`Not in the map: ${unknown.join(", ")}\n\n`);
  process.stdout.write(HELP);
  process.exit(values.help ? 0 : 1);
}

const stack = readRecord();
if (!stack) {
  process.stderr.write("Nothing to drive: run stack.mjs start first.\n");
  process.exit(1);
}

const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sha = git(["rev-parse", "HEAD"]);
const owner = values.pr
  ? `pr-${values.pr}`
  : git(["branch", "--show-current"]).replaceAll("/", "-");
const evidenceRoot =
  values.out ??
  (existsSync("/mnt/project-files")
    ? "/mnt/project-files/evidence"
    : join(tmpdir(), "lymi-evidence"));
const metroLog = resolve(root, "apps/mobile/.expo/verify-phone-metro.log");
const maestroEnv = {
  ...process.env,
  JAVA_HOME: process.env.JAVA_HOME ?? "/opt/homebrew/opt/openjdk",
  MAESTRO_CLI_NO_ANALYTICS: "1",
};

/** Polls until the check passes or the time runs out; grades and writes reach the Worker after the screen moves on. */
async function poll(check, seconds = 20) {
  let last;
  for (let i = 0; i < seconds; i += 1) {
    try {
      return await check();
    } catch (error) {
      last = error;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw last;
}

/** Opens the dev client on this worktree's Metro: without a URL it reopens the last Metro it saw. */
function openApp() {
  try {
    xcrun(["simctl", "terminate", stack.udid, BUNDLE_ID]);
  } catch {}
  // The developer menu's introduction and floating button cover the app's own top-bar controls.
  for (const [key, value] of [
    ["EXDevMenuIsOnboardingFinished", "YES"],
    ["EXDevMenuShowsAtLaunch", "NO"],
    ["EXDevMenuShowFloatingActionButton", "NO"],
  ]) {
    xcrun(["simctl", "spawn", stack.udid, "defaults", "write", BUNDLE_ID, key, "-bool", value]);
  }
  const metro = encodeURIComponent(`http://127.0.0.1:${stack.metroPort}`);
  const open = () =>
    xcrun(["simctl", "openurl", stack.udid, `exp+lymi://expo-development-client/?url=${metro}`]);
  try {
    open();
  } catch {
    // On a loaded Mac a cold openurl can time out; a launched app answers it quickly.
    xcrun(["simctl", "launch", stack.udid, BUNDLE_ID]);
    open();
  }
}

/** Runs the flow, and once more when Maestro's driver lost the app mid-snapshot rather than a command failing. */
function runFlow(args) {
  const run = () =>
    spawnSync("maestro", args, { cwd: featuresDir, env: maestroEnv, encoding: "utf8" });
  const first = run();
  if (first.status === 0 || /\.{3}\s*FAILED$/m.test(first.stdout)) return first;
  const second = run();
  return {
    ...second,
    stdout: `${first.stdout}\n[driver lost the app; ran again]\n${second.stdout}`,
  };
}

/** Red-box errors and warnings Metro printed while the flow ran. */
function metroProblems(from) {
  if (!existsSync(metroLog)) return [];
  return readFileSync(metroLog, "utf8")
    .slice(from)
    .split("\n")
    .filter((line) => /\b(ERROR|Error:|Uncaught)\b/.test(line))
    .map((line) => `Metro: ${line.trim()}`);
}

async function driveFeature(name) {
  const feature = await import(join(featuresDir, `${name}.mjs`));
  const persona = feature.persona ?? "learner";
  const dir = join(evidenceRoot, owner, `${name}-phone-${sha.slice(0, 8)}`);
  mkdirSync(dir, { recursive: true });

  const result = { checks: [], vars: null, flow: null, stored: null, error: null, problems: [] };
  try {
    const cookie = await signIn(stack.worker, persona, { reset: true });
    const api = async (path, init = {}) => {
      const response = await request(`${stack.worker}${path}`, {
        ...init,
        headers: { cookie, accept: "application/json", ...init.headers },
      });
      if (!response.ok)
        throw new Error(`${init.method ?? "GET"} ${path} answered HTTP ${response.status}`);
      return response.json();
    };

    result.checks = await doctor({ persona, cookie });
    if (report(result.checks)) {
      const before = await api("/api/dev/state");
      writeFileSync(join(dir, "00-before.state.json"), `${JSON.stringify(before, null, 2)}\n`);
      const logFrom = existsSync(metroLog) ? statSync(metroLog).size : 0;
      openApp();

      // The flow asserts what the screen should show from the stored state it is given.
      const vars = { PERSONA: persona, ...(await feature.env?.({ before, api })) };
      result.vars = vars;
      const maestro = runFlow([
        "--device",
        stack.udid,
        "test",
        "--test-output-dir",
        dir,
        ...Object.entries(vars).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
        join(featuresDir, `${name}.yaml`),
      ]);
      writeFileSync(join(dir, "maestro.log"), `${maestro.stdout}\n${maestro.stderr}`);
      result.flow = { ok: maestro.status === 0, steps: flowSteps(maestro.stdout) };

      const hierarchy = spawnSync("maestro", ["--device", stack.udid, "hierarchy"], {
        env: maestroEnv,
        encoding: "utf8",
      });
      if (hierarchy.status === 0)
        writeFileSync(join(dir, "99-end.hierarchy.json"), hierarchy.stdout);
      xcrun(["simctl", "io", stack.udid, "screenshot", join(dir, "99-end.png")]);

      if (result.flow.ok) {
        try {
          result.stored = await feature.check({ before, api, poll });
          writeFileSync(
            join(dir, "99-end.state.json"),
            `${JSON.stringify(result.stored, null, 2)}\n`,
          );
        } catch (error) {
          result.error = error.message;
        }
      }
      result.problems = metroProblems(logFrom);
    }
  } catch (error) {
    // An unanswered API call or a failed simctl command is a finding too; keep what was gathered.
    result.error ??= error.cause
      ? `${error.message}: ${error.cause.code ?? error.cause.message}`
      : error.message;
  }
  collectScreenshots(dir);

  const ok =
    result.checks.length > 0 &&
    result.checks.every((c) => c.ok) &&
    result.flow?.ok &&
    !result.error;
  writeFileSync(join(dir, "verdict.md"), verdict(feature, persona, ok, result));
  process.stdout.write(`${ok ? "PASS" : "FAIL"} ${name}  ${dir}\n`);
  return ok;
}

/** Maestro prints each command with its outcome; keep those lines as the step list. */
function flowSteps(stdout) {
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /\.{3}\s*(COMPLETED|FAILED|WARNED)$/.test(line));
}

/** Maestro writes takeScreenshot files beside the flow or in a timestamped folder; keep them with the verdict. */
function collectScreenshots(dir) {
  for (const base of [featuresDir, dir]) {
    for (const entry of readdirSync(base, { recursive: true })) {
      const file = join(base, entry);
      if (!entry.endsWith(".png") || dirname(file) === dir) continue;
      if (/^\d\d-/.test(entry.split("/").at(-1)))
        renameSync(file, join(dir, entry.split("/").at(-1)));
    }
  }
}

function verdict(feature, persona, ok, { checks, vars, flow, error, problems }) {
  return [
    `# ${feature.title}: ${ok ? "PASS" : "FAIL"}`,
    "",
    `${stack.worker} as ${persona}, Metro on ${stack.metroPort}, Simulator ${stack.udid}, ${new Date().toISOString()}`,
    "",
    vars
      ? `Flow given ${Object.entries(vars)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}.`
      : "",
    "",
    ...checks.map((c) => `- Doctor ${c.name}: ${c.ok ? "ok" : "FAIL"}, ${c.detail}`),
    "",
    flow ? `Flow ${flow.ok ? "passed" : "FAILED"} (maestro.log):` : "Flow not run.",
    ...(flow?.steps ?? []).map((s) => `- ${s}`),
    "",
    flow?.ok
      ? `Stored state: ${error ? `FAIL, ${error}` : "ok (99-end.state.json)"}`
      : error
        ? `FAIL before the flow: ${error}`
        : "",
    "",
    problems.length ? "Metro:" : "No errors in Metro's log.",
    ...problems.map((p) => `- ${p}`),
    "",
  ].join("\n");
}

let passed = true;
for (const name of positionals) passed = (await driveFeature(name)) && passed;
process.exitCode = passed ? 0 : 1;
