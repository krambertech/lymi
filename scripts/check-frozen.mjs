#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CONTRACTS = "apps/mobile/contract";
const QUEUED = "apps/web/src/server/queued-bodies.json";
const WRANGLER = "apps/web/wrangler.jsonc";

const isBelow = (version, minimum) => {
  const [a, b] = [version, minimum].map((v) => v.split(".").map(Number));
  const at = a.findIndex((part, index) => part !== b[index]);
  return at !== -1 && a[at] < b[at];
};

export function changedContracts({ base, current, minimum }) {
  return Object.entries(base).flatMap(([version, contract]) => {
    if (isBelow(version, minimum) || isDeepStrictEqual(current[version], contract)) return [];
    const change = current[version] ? "changed" : "deleted or renamed";
    return `${CONTRACTS}/${version}.json was ${change}, but the Worker still serves phone release ${version}: PHONE_MINIMUM_VERSION_IOS is ${minimum}. Restore it, or raise the minimum past it first (ADR 0032).`;
  });
}

export function changedQueuedBodies({ base, current }) {
  return Object.entries(base).flatMap(([id, body]) => {
    if (isDeepStrictEqual(current[id], body)) return [];
    const change = current[id] ? "changed" : "removed or renamed";
    return `${QUEUED}: ${JSON.stringify(id)} was ${change}. A queued grade or write has no maximum age and outlives the release that stored it, so restore the entry and keep the server accepting it.`;
  });
}

export function minimumVersion(wrangler) {
  const found = wrangler.match(/"PHONE_MINIMUM_VERSION_IOS":\s*"(\d+\.\d+\.\d+)"/);
  if (!found) throw new Error(`PHONE_MINIMUM_VERSION_IOS is not in ${WRANGLER}`);
  return found[1];
}

const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function atCommit(commit) {
  const files = git("ls-tree", "-r", "--name-only", commit, "--", CONTRACTS, QUEUED).split("\n");
  const read = (path) => JSON.parse(git("show", `${commit}:${path}`));
  return {
    contracts: Object.fromEntries(
      files
        .filter((path) => path.startsWith(CONTRACTS) && path.endsWith(".json"))
        .map((path) => [path.slice(CONTRACTS.length + 1, -".json".length), read(path)]),
    ),
    queued: files.includes(QUEUED) ? read(QUEUED) : {},
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = atCommit(git("merge-base", process.env.BASE_SHA || "origin/main", "HEAD").trim());
  const read = (path) => readFileSync(resolve(root, path), "utf8");
  const contracts = Object.fromEntries(
    readdirSync(resolve(root, CONTRACTS))
      .filter((name) => name.endsWith(".json"))
      .map((name) => [name.replace(/\.json$/, ""), JSON.parse(read(`${CONTRACTS}/${name}`))]),
  );
  const problems = [
    ...changedContracts({
      base: base.contracts,
      current: contracts,
      minimum: minimumVersion(read(WRANGLER)),
    }),
    ...changedQueuedBodies({
      base: base.queued,
      current: existsSync(resolve(root, QUEUED)) ? JSON.parse(read(QUEUED)) : {},
    }),
  ];
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("Frozen phone contracts and queued bodies are unchanged");
}
