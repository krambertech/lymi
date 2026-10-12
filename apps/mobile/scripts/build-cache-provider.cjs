// Expo build cache provider that shares one Simulator dev client across every worktree on the Mac.
// `expo run:ios` and `scripts/dev-client.mjs` both use it; docs/local-dev.md explains the workflow.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const CACHE_DIR =
  process.env.LYMI_DEV_CLIENT_CACHE ??
  path.join(os.homedir(), "Library/Caches/lymi/ios-dev-client");
const KEEP = Number(process.env.LYMI_DEV_CLIENT_KEEP ?? 4);

// The fingerprint leaves out the toolchain, and a binary from another Xcode can miss symbols at launch.
function xcodeBuild() {
  const out = execFileSync("xcodebuild", ["-version"], { encoding: "utf8" });
  return out.match(/Build version (\S+)/)?.[1] ?? "unknown";
}

async function calculateFingerprintHash({ projectRoot, platform }) {
  const { createFingerprintAsync } = require(
    require.resolve("@expo/fingerprint", { paths: [projectRoot] }),
  );
  // A relative root hashes differently, so `.` would miss what Expo's absolute root stored.
  const { hash } = await createFingerprintAsync(path.resolve(projectRoot), {
    platforms: [platform],
  });
  return `${hash}-xcode${xcodeBuild()}`;
}

function entryName(platform, fingerprintHash, runOptions) {
  return `${platform}-${fingerprintHash}-${runOptions?.configuration ?? "Debug"}.app`;
}

async function resolveBuildCache({ platform, fingerprintHash, runOptions }) {
  const entry = path.join(CACHE_DIR, entryName(platform, fingerprintHash, runOptions));
  if (!fs.existsSync(entry)) return null;
  const now = new Date();
  fs.utimesSync(entry, now, now);
  return entry;
}

async function uploadBuildCache({ platform, fingerprintHash, buildPath, runOptions }) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const entry = path.join(CACHE_DIR, entryName(platform, fingerprintHash, runOptions));
  // Copy beside the entry and rename, so a reader never sees half an app and a racing build just loses.
  const staging = path.join(CACHE_DIR, `.staging-${process.pid}-${path.basename(entry)}`);
  fs.rmSync(staging, { recursive: true, force: true });
  fs.cpSync(buildPath, staging, { recursive: true, verbatimSymlinks: true });
  try {
    fs.renameSync(staging, entry);
    console.log(`› Cached the dev client at ${entry}`);
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    if (error.code !== "ENOTEMPTY" && error.code !== "EEXIST") throw error;
  }
  prune();
  return entry;
}

function prune() {
  const entries = fs
    .readdirSync(CACHE_DIR)
    .filter((name) => name.endsWith(".app") && !name.startsWith("."))
    .map((name) => ({ name, mtime: fs.statSync(path.join(CACHE_DIR, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const { name } of entries.slice(KEEP)) {
    fs.rmSync(path.join(CACHE_DIR, name), { recursive: true, force: true });
    console.log(`› Pruned the cached dev client ${name}`);
  }
}

module.exports = { CACHE_DIR, calculateFingerprintHash, resolveBuildCache, uploadBuildCache };
