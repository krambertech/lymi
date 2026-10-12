// Installs the shared Simulator dev client into one simulator and opens it on this worktree's Metro.
// Builds it only when no worktree has built this fingerprint yet; docs/local-dev.md has the workflow.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const provider = require("./build-cache-provider.cjs");

const USAGE = `Usage: pnpm --filter @lymi/mobile dev-client <simulator name or UDID> <metro port> [--rebuild] [--keep-build]

  --rebuild     Build again even when the cache has this fingerprint, and replace the cached app.
  --keep-build  Skip the clean prebuild and keep Xcode's files in ios/build/dev-client, so the next build is incremental.`;
const DEVICE_TYPE = "iPhone 17 Pro";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const flags = process.argv.slice(2).filter((arg) => arg.startsWith("--"));
const [simulator, port] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (!simulator || !/^\d+$/.test(port ?? "")) {
  console.error(USAGE);
  process.exit(1);
}
const rebuild = flags.includes("--rebuild");
const keepBuild = flags.includes("--keep-build");

const started = performance.now();
const seconds = () => `${((performance.now() - started) / 1000).toFixed(1)} s`;
const cache = { projectRoot: root, platform: "ios", runOptions: { configuration: "Debug" } };
const fingerprintHash = await provider.calculateFingerprintHash(cache);
console.log(`› Fingerprint ${fingerprintHash}`);

let app = rebuild ? null : await provider.resolveBuildCache({ ...cache, fingerprintHash });
let built = false;
if (!app) {
  app = await withBuildLock(async () => {
    const cached = rebuild ? null : await provider.resolveBuildCache({ ...cache, fingerprintHash });
    if (cached) return cached;
    built = true;
    return build();
  });
}
console.log(`› ${built ? "Built" : "Using the cached"} dev client ${app}`);

const device = ensureSimulator(simulator);
const bundleId = plist(app, "CFBundleIdentifier");
xcrun(["simctl", "terminate", device.udid, bundleId], { allowFailure: true });
xcrun(["simctl", "install", device.udid, app]);
console.log(`› Installed on ${device.name} (${device.udid}) after ${seconds()}`);

// Without a URL the dev client reopens the last server it saw, which may be another worktree's Metro.
const metro = `http://127.0.0.1:${port}`;
if (!(await metroRunning(metro))) {
  console.warn(
    `! Nothing answers at ${metro}. Start Metro with: npx expo start --dev-client --port ${port}`,
  );
}
const { slug } = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
allowLinks(device.udid, `exp+${slug}`, bundleId);
xcrun([
  "simctl",
  "openurl",
  device.udid,
  `exp+${slug}://expo-development-client/?url=${encodeURIComponent(metro)}`,
]);
console.log(`› Opened the dev client on ${metro}`);

async function build() {
  const env = { ...process.env, LANG: "en_US.UTF-8", CI: "1" };
  // A clean prebuild drops files a removed plugin left behind; --keep-build keeps ios/build/dev-client instead.
  const clean = keepBuild ? [] : ["--clean"];
  run("npx", ["expo", "prebuild", "--platform", "ios", ...clean], { env });
  const derivedData = join(root, "ios/build/dev-client");
  await xcodebuild(
    [
      "-workspace",
      "ios/Lymi.xcworkspace",
      "-scheme",
      "Lymi",
      "-configuration",
      "Debug",
      "-destination",
      "generic/platform=iOS Simulator",
      "-derivedDataPath",
      derivedData,
      "-quiet",
      "COMPILER_INDEX_STORE_ENABLE=NO",
      "build",
    ],
    { ...env, RCT_NO_LAUNCH_PACKAGER: "true" },
  );
  const after = await provider.calculateFingerprintHash(cache);
  if (after !== fingerprintHash) {
    throw new Error(`The fingerprint changed during the build (${after}); run the command again.`);
  }
  const product = join(derivedData, "Build/Products/Debug-iphonesimulator/Lymi.app");
  const entry = await provider.uploadBuildCache({ ...cache, fingerprintHash, buildPath: product });
  if (!keepBuild) rmSync(derivedData, { recursive: true, force: true });
  return entry;
}

// Xcode's build service reads its compiler probes only after they exit. When the Mac's pipe memory
// is used up, pipes stop growing past 16 KB, the probes block writing, and the build waits forever.
async function xcodebuild(args, env) {
  for (let attempt = 1; ; attempt++) {
    const child = spawn("xcodebuild", args, { cwd: root, env, stdio: "inherit" });
    let stalled = false;
    const watchdog = setInterval(() => {
      if (stalledProbes(child.pid)) {
        stalled = true;
        child.kill("SIGTERM");
      }
    }, 15_000);
    const code = await new Promise((resolve) => child.on("exit", resolve));
    clearInterval(watchdog);
    if (code === 0) return;
    if (!stalled) throw new Error(`xcodebuild failed with exit code ${code}.`);
    console.warn(`! Xcode stalled at CreateBuildDescription: pipes cannot grow, so its probes block.
  Processes holding the most pipes: ${pipeHolders()}. Quitting the top one frees pipe memory.`);
    if (attempt === 3)
      throw new Error("Xcode stalled three times; free pipe memory and run again.");
    console.warn(`! Retrying the build (attempt ${attempt + 1} of 3)`);
  }
}

function stalledProbes(xcodebuildPid) {
  const rows = execFileSync("ps", ["-A", "-o", "pid=,ppid=,etime=,command="], { encoding: "utf8" })
    .trim()
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .map(([pid, ppid, etime, ...command]) => ({ pid, ppid, etime, command: command.join(" ") }));
  const services = new Set(
    rows.filter((row) => row.ppid === String(xcodebuildPid)).map((r) => r.pid),
  );
  return rows.some(
    (row) =>
      services.has(row.ppid) && row.command.includes("clang -v -E -dM") && minutes(row.etime) >= 1,
  );
}

function minutes(etime) {
  const [clock, days = "0"] = etime.split("-").reverse();
  const [s = 0, m = 0, h = 0] = clock.split(":").reverse().map(Number);
  return Number(days) * 1440 + h * 60 + m + s / 60;
}

function pipeHolders() {
  const lsof = spawnSync("lsof", ["-n", "-F", "pct"], { encoding: "utf8", maxBuffer: 256 << 20 });
  const counts = new Map();
  let name = "";
  for (const line of lsof.stdout.split("\n")) {
    if (line.startsWith("c")) name = line.slice(1);
    if (line === "tPIPE") counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([command, count]) => `${command} (${count})`)
    .join(", ");
}

// One native build at a time on the Mac: a second worktree waits, then finds the first one's app.
async function withBuildLock(task) {
  mkdirSync(provider.CACHE_DIR, { recursive: true });
  const lock = join(provider.CACHE_DIR, ".build.lock");
  let waiting = false;
  for (;;) {
    try {
      mkdirSync(lock);
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const holder = Number(readFileSync(join(lock, "pid"), { encoding: "utf8", flag: "a+" }));
      const orphaned = !holder && Date.now() - statSync(lock).mtimeMs > 60_000;
      if ((holder && !alive(holder)) || orphaned) {
        rmSync(lock, { recursive: true, force: true });
        continue;
      }
      if (!waiting)
        console.log(`› Waiting for another worktree's native build (pid ${holder || "?"})`);
      waiting = true;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  writeFileSync(join(lock, "pid"), String(process.pid));
  const release = () => rmSync(lock, { recursive: true, force: true });
  process.once("SIGINT", () => {
    release();
    process.exit(130);
  });
  try {
    if (rebuild) {
      const entry = await provider.resolveBuildCache({ ...cache, fingerprintHash });
      if (entry) rmSync(entry, { recursive: true, force: true });
    }
    return await task();
  } finally {
    release();
  }
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function ensureSimulator(nameOrUdid) {
  const list = JSON.parse(xcrun(["simctl", "list", "devices", "available", "--json"]));
  const devices = Object.values(list.devices).flat();
  let device =
    devices.find((d) => d.udid === nameOrUdid) ?? devices.find((d) => d.name === nameOrUdid);
  if (!device) {
    const { runtimes } = JSON.parse(xcrun(["simctl", "list", "runtimes", "available", "--json"]));
    const runtime = runtimes.filter((r) => r.platform === "iOS").at(-1);
    const udid = xcrun(["simctl", "create", nameOrUdid, DEVICE_TYPE, runtime.identifier]).trim();
    console.log(`› Created the simulator ${nameOrUdid} (${DEVICE_TYPE}, ${runtime.name})`);
    device = { udid, name: nameOrUdid, state: "Shutdown" };
  }
  if (device.state !== "Booted") {
    xcrun(["simctl", "boot", device.udid]);
    xcrun(["simctl", "bootstatus", device.udid]);
  }
  return device;
}

// Pre-approves the scheme as Expo's CLI does, so iOS opens the link without asking "Open in Lymi?".
function allowLinks(udid, scheme, bundleId) {
  const plistPath = join(
    homedir(),
    "Library/Developer/CoreSimulator/Devices",
    udid,
    "data/Library/Preferences/com.apple.launchservices.schemeapproval.plist",
  );
  const approvals = existsSync(plistPath)
    ? JSON.parse(
        execFileSync("plutil", ["-convert", "json", "-o", "-", plistPath], { encoding: "utf8" }),
      )
    : {};
  approvals[`com.apple.CoreSimulator.CoreSimulatorBridge-->${scheme}`] = bundleId;
  execFileSync("plutil", ["-convert", "binary1", "-o", plistPath, "-"], {
    input: JSON.stringify(approvals),
  });
}

async function metroRunning(url) {
  try {
    const response = await fetch(`${url}/status`, { signal: AbortSignal.timeout(2000) });
    return (await response.text()).includes("packager-status:running");
  } catch {
    return false;
  }
}

function plist(appPath, key) {
  const file = join(appPath, "Info.plist");
  if (!existsSync(file)) throw new Error(`${appPath} has no Info.plist; run with --rebuild.`);
  return execFileSync("plutil", ["-extract", key, "raw", file], { encoding: "utf8" }).trim();
}

function xcrun(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("xcrun", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

function run(command, args, options) {
  execFileSync(command, args, { cwd: root, stdio: "inherit", ...options });
}
