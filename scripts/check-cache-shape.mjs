#!/usr/bin/env node

// Fails when the responses the phone reads change without a decision on CACHE_SHAPE.
// Usage: node scripts/check-cache-shape.mjs [--write]

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const contracts = join(root, "apps/mobile/contract");
const cacheFile = join(root, "apps/mobile/src/data/cache.ts");
const lockFile = join(root, "apps/mobile/src/data/cache-shape.json");

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonical(value[key])]),
  );
};

/** A hash of every successful response schema in a frozen contract, with the schemas they reach. */
export function responseFingerprint(contract) {
  const schemas = contract.components?.schemas ?? {};
  const responses = {};
  const reached = {};
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    const name = typeof value.$ref === "string" && value.$ref.replace("#/components/schemas/", "");
    if (name && !(name in reached)) {
      reached[name] = schemas[name];
      visit(schemas[name]);
    }
    Object.values(value).forEach(visit);
  };
  for (const [path, methods] of Object.entries(contract.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      for (const [status, response] of Object.entries(operation.responses ?? {})) {
        if (!status.startsWith("2")) continue;
        responses[`${method.toUpperCase()} ${path} ${status}`] = response;
        visit(response);
      }
    }
  }
  const body = JSON.stringify(canonical({ responses, schemas: reached }));
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

export function cacheShapeOf(source) {
  const found = source.match(/const CACHE_SHAPE = "([^"]+)"/);
  if (!found) throw new Error("CACHE_SHAPE is not in apps/mobile/src/data/cache.ts");
  return found[1];
}

/** The newest frozen release, which the next phone build is checked against. */
export function newestContract(names) {
  const versions = names
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""));
  const order = (version) => version.split(".").map(Number);
  versions.sort((a, b) => {
    const [x, y] = [order(a), order(b)];
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
    }
    return 0;
  });
  return versions.at(-1);
}

export function verdict(lock, current) {
  if (lock.responses === current.responses && lock.cacheShape === current.cacheShape) return null;
  if (lock.responses !== current.responses && lock.cacheShape === current.cacheShape) {
    return [
      "The responses in the phone's frozen contract changed, and CACHE_SHAPE did not.",
      "A cache kept by an earlier build renders before the refetch, so a screen that now reads a field it lacks crashes.",
      "If a phone screen reads a new or changed response field, bump CACHE_SHAPE in apps/mobile/src/data/cache.ts.",
      "Either way, record the decision with: node scripts/check-cache-shape.mjs --write",
    ].join("\n");
  }
  return "CACHE_SHAPE changed. Record it with: node scripts/check-cache-shape.mjs --write";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = newestContract(readdirSync(contracts));
  const contract = JSON.parse(readFileSync(join(contracts, `${version}.json`), "utf8"));
  const current = {
    cacheShape: cacheShapeOf(readFileSync(cacheFile, "utf8")),
    contract: version,
    responses: responseFingerprint(contract),
  };
  if (process.argv.includes("--write")) {
    writeFileSync(lockFile, `${JSON.stringify(current, null, 2)}\n`);
    console.log(
      `Recorded CACHE_SHAPE ${current.cacheShape} against ${version} ${current.responses}`,
    );
    process.exit(0);
  }
  const problem = verdict(JSON.parse(readFileSync(lockFile, "utf8")), current);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  console.log(`CACHE_SHAPE ${current.cacheShape} matches the phone's ${version} responses`);
}
