#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationsDir = resolve(root, "apps/web/migrations");
const manifestPath = resolve(root, "scripts/migration-manifest.json");

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

export function createMigrationManifest(files) {
  const migrations = [...files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, content]) => ({ name, sha256: sha256(content) }));

  for (const [index, entry] of migrations.entries()) {
    const match = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(entry.name);
    if (!match || Number(match[1]) !== index) {
      throw new Error(
        `migration ${entry.name} must use sequence ${String(index).padStart(4, "0")}`,
      );
    }
  }

  return { migrations };
}

export function updateMigrationManifest({ files, baseline }) {
  const next = createMigrationManifest(files);
  for (const [index, entry] of (baseline?.migrations ?? []).entries()) {
    const replacement = next.migrations[index];
    if (replacement?.name !== entry.name || replacement.sha256 !== entry.sha256) {
      throw new Error(`merged migration ${entry.name} is immutable; add a new migration instead`);
    }
  }
  return next;
}

export function validateMigrationHistory({ files, manifest, baseline }) {
  const names = [...files.keys()].sort();
  const manifestNames = manifest.migrations.map(({ name }) => name);
  if (JSON.stringify(names) !== JSON.stringify(manifestNames)) {
    throw new Error("migration files and scripts/migration-manifest.json do not match");
  }

  createMigrationManifest(files);
  for (const entry of manifest.migrations) {
    if (sha256(files.get(entry.name)) !== entry.sha256) {
      throw new Error(`migration ${entry.name} changed without updating its recorded checksum`);
    }
  }

  if (!baseline) return;
  const current = new Map(manifest.migrations.map((entry) => [entry.name, entry.sha256]));
  for (const entry of baseline.migrations) {
    if (current.get(entry.name) !== entry.sha256) {
      throw new Error(`merged migration ${entry.name} is immutable; add a new migration instead`);
    }
  }
}

function baselineManifest(baseSha) {
  if (!baseSha) return undefined;
  const listing = spawnSync(
    "git",
    ["ls-tree", "-r", "--name-only", baseSha, "--", "scripts/migration-manifest.json"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  if (listing.status !== 0) {
    throw new Error(`unable to inspect migration history at base commit ${baseSha}`);
  }
  if (!listing.stdout.trim()) return undefined;

  const result = spawnSync("git", ["show", `${baseSha}:scripts/migration-manifest.json`], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`unable to read migration history at base commit ${baseSha}`);
  }
  return JSON.parse(result.stdout);
}

function readMigrationFiles() {
  return new Map(
    readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => [name, readFileSync(resolve(migrationsDir, name))]),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(manifestPath)) throw new Error("scripts/migration-manifest.json is missing");
  const files = readMigrationFiles();
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (process.argv.includes("--write")) {
    const next = updateMigrationManifest({
      files,
      baseline: baselineManifest(process.env.BASE_SHA ?? "origin/main"),
    });
    writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
    process.stdout.write(`Migration manifest updated: ${files.size} migration(s).\n`);
    process.exit(0);
  }
  validateMigrationHistory({
    files,
    manifest,
    baseline: baselineManifest(process.env.BASE_SHA),
  });
  process.stdout.write(`Migration history verified: ${files.size} immutable migration(s).\n`);
}
