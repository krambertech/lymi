#!/usr/bin/env node

// Runs a Workers Builds deploy command unless production already serves a newer commit of `main`.
// Builds for merges minutes apart run at once, and the slowest one would otherwise go live last.
// Usage: node scripts/deploy-newest.mjs <health URL> -- <deploy command…>

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/**
 * Whether to deploy `ours` while `live` serves. `contains(a, b)` answers whether commit `b` is
 * already in `a`'s history; it returns null when git cannot tell, and then the deploy goes ahead.
 */
export function shouldDeploy({ ours, live, contains }) {
  if (!ours || !live || ours === live) return { deploy: true };
  const newer = contains(live, ours);
  if (newer === true)
    return { deploy: false, reason: `production serves ${live}, which already contains ${ours}` };
  if (newer === null)
    return { deploy: true, reason: `could not compare ${ours} with the live ${live}` };
  return { deploy: true };
}

/** Whether `ancestor` is in `commit`'s history, fetching `commit` when the clone lacks it. */
export function gitContains(commit, ancestor, git = runGit) {
  if (
    git(["cat-file", "-e", `${commit}^{commit}`]) !== 0 &&
    git(["fetch", "--quiet", "origin", commit]) !== 0
  ) {
    return null;
  }
  const status = git(["merge-base", "--is-ancestor", ancestor, commit]);
  return status === 0 ? true : status === 1 ? false : null;
}

function runGit(args) {
  // A fetch stuck on the network times out to null, which deploys rather than failing the build.
  return spawnSync("git", args, { stdio: "ignore", timeout: 60_000 }).status;
}

async function liveTag(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return response.ok ? ((await response.json())?.version?.tag ?? null) : null;
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [url, separator, command, ...args] = process.argv.slice(2);
  if (!url || separator !== "--" || !command) {
    process.stderr.write(
      "Usage: node scripts/deploy-newest.mjs <health URL> -- <deploy command…>\n",
    );
    process.exit(2);
  }
  const ours = process.env.WORKERS_CI_COMMIT_SHA;
  const decision = shouldDeploy({ ours, live: await liveTag(url), contains: gitContains });
  if (decision.reason)
    process.stdout.write(
      `${decision.deploy ? "Deploying anyway" : "Skipped the deploy"}: ${decision.reason}.\n`,
    );
  if (!decision.deploy) process.exit(0);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  process.exit(result.status ?? 1);
}
