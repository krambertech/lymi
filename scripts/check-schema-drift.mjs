#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationsDir = resolve(root, "apps/web/migrations");
const schemaPath = resolve(root, "packages/core/src/schema/index.ts");

function readTree(dir) {
  const files = new Map();
  const visit = (current) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) visit(path);
      else files.set(relative(dir, path), readFileSync(path));
    }
  };
  visit(dir);
  return files;
}

export function changedMigrationPaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((path) => {
      if (!before.has(path) || !after.has(path)) return true;
      return !before.get(path).equals(after.get(path));
    })
    .sort();
}

export function checkSchemaDrift() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "lymi-schema-drift-"));
  const temporaryMigrations = join(temporaryRoot, "migrations");

  try {
    cpSync(migrationsDir, temporaryMigrations, { recursive: true });
    const generation = spawnSync(
      "pnpm",
      [
        "--filter",
        "@lymi/web",
        "exec",
        "drizzle-kit",
        "generate",
        "--dialect",
        "sqlite",
        "--schema",
        schemaPath,
        "--out",
        temporaryMigrations,
      ],
      { cwd: root, encoding: "utf8", env: { ...process.env, CI: "true" } },
    );

    if (generation.status !== 0) {
      process.stderr.write(generation.stdout);
      process.stderr.write(generation.stderr);
      throw new Error("Drizzle could not verify schema drift");
    }

    const changed = changedMigrationPaths(readTree(migrationsDir), readTree(temporaryMigrations));
    if (changed.length > 0) {
      throw new Error(
        `database schema changed without a generated migration (${changed.join(", ")}); run pnpm db:generate`,
      );
    }

    process.stdout.write("Database schema matches the generated migration history.\n");
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkSchemaDrift();
}
