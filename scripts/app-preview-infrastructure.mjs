#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
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
  const [{ subdomain }, database, namespace, bucket] = await Promise.all([
    cfRequest(client, "/workers/subdomain"),
    ensure(
      () => exactD1(client, names.databaseName),
      () =>
        cfRequest(client, "/d1/database", {
          method: "POST",
          body: JSON.stringify({ name: names.databaseName, primary_location_hint: "eeur" }),
        }),
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
  };
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
    process.stdout.write(`::add-mask::${secrets.APP_PREVIEW_KEY}\n`);
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `${[
        `worker_name=${infrastructure.names.workerName}`,
        `entry_url=${entryUrl}`,
        `preview_url=${infrastructure.previewUrl}`,
        `database_name=${infrastructure.names.databaseName}`,
      ].join("\n")}\n`,
    );
  }
  process.stdout.write(`Prepared isolated app preview resources for PR #${prNumber}.\n`);
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
  else if (command === "cleanup") await cleanupFromCli(args);
  else throw new Error("Expected prepare or cleanup");
}
