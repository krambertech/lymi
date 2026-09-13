#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const apiRoot = "https://api.cloudflare.com/client/v4/accounts";

export function previewNames(value) {
  const prNumber = Number(value);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    throw new Error("pull request number must be a positive integer");
  }
  const workerName = `lymi-app-pr-${prNumber}`;
  return {
    prNumber,
    workerName,
    databaseName: `${workerName}-db`,
    namespaceTitle: `${workerName}-sessions`,
    bucketName: `${workerName}-audio`,
    alias: "preview",
  };
}

export function derivePreviewSecrets(rootSecret, workerName) {
  if ((rootSecret?.length ?? 0) < 32) {
    throw new Error("LYMI_APP_PREVIEW_AUTH_SECRET must be at least 32 characters");
  }
  const derive = (purpose) =>
    createHmac("sha256", rootSecret).update(`${purpose}:${workerName}`).digest("base64url");
  return {
    BETTER_AUTH_SECRET: derive("better-auth"),
    APP_PREVIEW_KEY: derive("preview-access"),
  };
}

export function makePreviewConfig(base, { names, previewUrl, databaseId, namespaceId }) {
  const database = base.d1_databases?.find((item) => item.binding === "DB");
  if (!database?.migrations_dir) throw new Error("generated Worker config has no DB migrations");

  return {
    ...base,
    name: names.workerName,
    routes: [],
    triggers: undefined,
    workers_dev: true,
    preview_urls: true,
    vars: {
      PUBLIC_SITE_URL: "https://lymi.app",
      PRODUCT_URL: previewUrl,
      ALLOWED_EMAILS: "",
      APP_PREVIEW: "true",
    },
    kv_namespaces: [{ binding: "SESSIONS", id: namespaceId }],
    r2_buckets: [{ binding: "AUDIO", bucket_name: names.bucketName }],
    d1_databases: [
      {
        binding: "DB",
        database_name: names.databaseName,
        database_id: databaseId,
        migrations_dir: database.migrations_dir,
      },
    ],
  };
}

async function cfRequest({ accountId, token, fetchImpl }, path, init = {}, allowMissing = false) {
  const response = await fetchImpl(`${apiRoot}/${accountId}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (allowMissing && response.status === 404) return null;

  const text = await response.text();
  const payload = text ? JSON.parse(text) : { success: response.ok, result: null };
  if (!response.ok || payload.success === false) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(message || `Cloudflare API returned HTTP ${response.status}`);
  }
  return payload.result;
}

async function exactD1(client, name) {
  const result = await cfRequest(
    client,
    `/d1/database?name=${encodeURIComponent(name)}&per_page=100`,
  );
  return result.find((item) => item.name === name) ?? null;
}

function createD1(client, name) {
  return cfRequest(client, "/d1/database", {
    method: "POST",
    body: JSON.stringify({ name, primary_location_hint: "eeur" }),
  });
}

async function exactNamespace(client, title) {
  const result = await cfRequest(client, "/storage/kv/namespaces?per_page=1000");
  return result.find((item) => item.title === title) ?? null;
}

async function exactBucket(client, name) {
  const result = await cfRequest(
    client,
    `/r2/buckets?name_contains=${encodeURIComponent(name)}&per_page=1000`,
  );
  return result.buckets?.find((item) => item.name === name) ?? null;
}

async function workerExists(client, name) {
  const settings = await cfRequest(
    client,
    `/workers/scripts/${encodeURIComponent(name)}/settings`,
    {},
    true,
  );
  return settings !== null;
}

async function ensure(find, create) {
  const existing = await find();
  if (existing) return existing;
  try {
    return await create();
  } catch (error) {
    const raced = await find();
    if (raced) return raced;
    throw error;
  }
}

export async function ensurePreviewInfrastructure({
  accountId,
  token,
  prNumber,
  fetchImpl = fetch,
}) {
  if (!accountId || !token) throw new Error("Cloudflare preview credentials are required");
  const names = previewNames(prNumber);
  const client = { accountId, token, fetchImpl };
  const [exists, { subdomain }, database, namespace, bucket] = await Promise.all([
    workerExists(client, names.workerName),
    cfRequest(client, "/workers/subdomain"),
    ensure(
      () => exactD1(client, names.databaseName),
      () => createD1(client, names.databaseName),
    ),
    ensure(
      () => exactNamespace(client, names.namespaceTitle),
      () =>
        cfRequest(client, "/storage/kv/namespaces", {
          method: "POST",
          body: JSON.stringify({ title: names.namespaceTitle }),
        }),
    ),
    ensure(
      () => exactBucket(client, names.bucketName),
      () =>
        cfRequest(client, "/r2/buckets", {
          method: "POST",
          body: JSON.stringify({ name: names.bucketName, locationHint: "eeur" }),
        }),
    ),
  ]);

  if (!subdomain || !database.uuid || !namespace.id || bucket.name !== names.bucketName) {
    throw new Error("Cloudflare did not return the complete isolated preview resources");
  }
  return {
    names,
    previewUrl: `https://${names.alias}-${names.workerName}.${subdomain}.workers.dev`,
    databaseId: database.uuid,
    namespaceId: namespace.id,
    workerExists: exists,
  };
}

export function migrationFailureReason({ status, output = "", error }) {
  if (error) return error.message;
  const lines = output
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strips Wrangler's ANSI colors.
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split("\n")
    .map((line) => line.trim());
  const reported = lines.findLast((line) => line.includes("[ERROR]"));
  return reported?.replace(/^.*\[ERROR\]\s*/, "") || `Wrangler exited with code ${status}`;
}

function applyWithWrangler(configPath) {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@lymi/web",
      "exec",
      "wrangler",
      "d1",
      "migrations",
      "apply",
      "DB",
      "--remote",
      "--config",
      resolve(configPath),
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  return {
    ok: result.status === 0,
    reason: migrationFailureReason({
      status: result.status,
      output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
      error: result.error,
    }),
  };
}

// Wrangler records migrations by filename, so a rebase that renumbers one re-runs it; the preview holds only seeded data, so any failure rebuilds it once.
export async function migratePreviewDatabase({
  accountId,
  token,
  prNumber,
  configPath,
  applyMigrations = () => applyWithWrangler(configPath),
  fetchImpl = fetch,
  log = (line) => process.stdout.write(`${line}\n`),
}) {
  if (!accountId || !token) throw new Error("Cloudflare preview credentials are required");
  const names = previewNames(prNumber);
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const binding = config.d1_databases?.find((item) => item.binding === "DB");
  if (binding?.database_name !== names.databaseName) {
    throw new Error(`${configPath} is not bound to ${names.databaseName}`);
  }

  const first = await applyMigrations();
  if (first.ok) return { rebuilt: false, databaseId: binding.database_id };

  log(
    `::warning title=Preview database rebuilt::Migrations did not apply to ${names.databaseName} (${first.reason}). Rebuilding it from empty and applying the full migration list.`,
  );
  const client = { accountId, token, fetchImpl };
  const existing = await exactD1(client, names.databaseName);
  if (existing) await cfRequest(client, `/d1/database/${existing.uuid}`, { method: "DELETE" });
  const database = await createD1(client, names.databaseName);
  if (!database?.uuid) throw new Error("Cloudflare did not return the rebuilt preview database");

  binding.database_id = database.uuid;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const second = await applyMigrations();
  if (!second.ok) {
    throw new Error(
      `Migrations fail on an empty preview database (${second.reason}). This is a broken migration, not a stale preview.`,
    );
  }
  log(`Rebuilt ${names.databaseName} and applied every migration.`);
  return { rebuilt: true, databaseId: database.uuid };
}

export async function cleanupPreviewInfrastructure({
  accountId,
  token,
  prNumber,
  fetchImpl = fetch,
}) {
  if (!accountId || !token) throw new Error("Cloudflare preview credentials are required");
  const names = previewNames(prNumber);
  const client = { accountId, token, fetchImpl };
  const [database, namespace, bucket] = await Promise.all([
    exactD1(client, names.databaseName),
    exactNamespace(client, names.namespaceTitle),
    exactBucket(client, names.bucketName),
  ]);

  await cfRequest(
    client,
    `/workers/scripts/${encodeURIComponent(names.workerName)}?force=true`,
    { method: "DELETE" },
    true,
  );
  if (bucket) {
    await cfRequest(client, `/r2/buckets/${encodeURIComponent(names.bucketName)}`, {
      method: "DELETE",
    });
  }
  if (namespace) {
    await cfRequest(client, `/storage/kv/namespaces/${namespace.id}`, { method: "DELETE" });
  }
  if (database) {
    await cfRequest(client, `/d1/database/${database.uuid}`, { method: "DELETE" });
  }
  return names;
}

async function prepareFromCli([prNumber, inputPath, outputPath, secretsPath]) {
  if (!prNumber || !inputPath || !outputPath || !secretsPath) {
    throw new Error(
      "Usage: app-preview-infrastructure.mjs prepare <pr-number> <input-config> <output-config> <secrets-file>",
    );
  }
  const infrastructure = await ensurePreviewInfrastructure({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    prNumber,
  });
  const secrets = derivePreviewSecrets(
    process.env.LYMI_APP_PREVIEW_AUTH_SECRET,
    infrastructure.names.workerName,
  );
  const config = makePreviewConfig(JSON.parse(readFileSync(inputPath, "utf8")), infrastructure);
  writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(secretsPath, `${JSON.stringify(secrets)}\n`, { mode: 0o600 });

  const entryUrl = new URL("/_preview", infrastructure.previewUrl);
  entryUrl.searchParams.set("key", secrets.APP_PREVIEW_KEY);
  if (process.env.GITHUB_OUTPUT) {
    // This scoped capability is intentionally published as the GitHub deployment URL.
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `${[
        `worker_name=${infrastructure.names.workerName}`,
        `entry_url=${entryUrl}`,
        `preview_url=${infrastructure.previewUrl}`,
        `database_name=${infrastructure.names.databaseName}`,
        `worker_exists=${infrastructure.workerExists}`,
      ].join("\n")}\n`,
    );
  }
  process.stdout.write(`Prepared isolated app preview resources for PR #${prNumber}.\n`);
}

async function migrateFromCli([prNumber, configPath]) {
  if (!prNumber || !configPath) {
    throw new Error("Usage: app-preview-infrastructure.mjs migrate <pr-number> <preview-config>");
  }
  try {
    await migratePreviewDatabase({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      token: process.env.CLOUDFLARE_API_TOKEN,
      prNumber,
      configPath,
    });
  } catch (error) {
    process.stdout.write(`::error title=Preview migrations failed::${error.message}\n`);
    process.exitCode = 1;
  }
}

async function cleanupFromCli([prNumber]) {
  if (!prNumber) {
    throw new Error("Usage: app-preview-infrastructure.mjs cleanup <pr-number>");
  }
  await cleanupPreviewInfrastructure({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    prNumber,
  });
  process.stdout.write(`Removed isolated app preview resources for PR #${prNumber}.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "prepare") await prepareFromCli(args);
  else if (command === "migrate") await migrateFromCli(args);
  else if (command === "cleanup") await cleanupFromCli(args);
  else throw new Error("Expected prepare, migrate or cleanup");
}
