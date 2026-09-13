import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanupPreviewInfrastructure,
  derivePreviewSecrets,
  ensurePreviewInfrastructure,
  makePreviewConfig,
  previewNames,
} from "./app-preview-infrastructure.mjs";

const accountId = "account";
const token = "token";

function response(result, status = 200) {
  return new Response(JSON.stringify({ success: status < 400, result, errors: [] }), { status });
}

test("names every resource from a validated pull request number", () => {
  assert.deepEqual(previewNames("105"), {
    prNumber: 105,
    workerName: "lymi-app-pr-105",
    databaseName: "lymi-app-pr-105-db",
    namespaceTitle: "lymi-app-pr-105-sessions",
    bucketName: "lymi-app-pr-105-audio",
    alias: "preview",
  });
  assert.throws(() => previewNames("../production"), /positive integer/);
});

test("derives stable, purpose-separated preview capabilities", () => {
  const first = derivePreviewSecrets("a-root-secret-that-is-at-least-thirty-two-characters", "w");
  const second = derivePreviewSecrets("a-root-secret-that-is-at-least-thirty-two-characters", "w");
  assert.deepEqual(first, second);
  assert.notEqual(first.BETTER_AUTH_SECRET, first.APP_PREVIEW_KEY);
  assert.ok(first.BETTER_AUTH_SECRET.length >= 32);
});

test("rewrites every production boundary to isolated preview resources", () => {
  const names = previewNames(105);
  const config = makePreviewConfig(
    {
      name: "lymi",
      routes: [{ pattern: "my.lymi.app", custom_domain: true }],
      triggers: { crons: ["*/15 * * * *"] },
      vars: { PRODUCT_URL: "https://my.lymi.app" },
      d1_databases: [{ binding: "DB", migrations_dir: "../../migrations" }],
    },
    {
      names,
      previewUrl: "https://preview-lymi-app-pr-105.example.workers.dev",
      databaseId: "preview-db-id",
      namespaceId: "preview-kv-id",
    },
  );

  assert.equal(config.name, names.workerName);
  assert.deepEqual(config.routes, []);
  assert.equal(config.triggers, undefined);
  assert.equal(config.vars.PRODUCT_URL, "https://preview-lymi-app-pr-105.example.workers.dev");
  assert.equal(config.vars.APP_PREVIEW, "true");
  assert.equal(config.d1_databases[0].database_id, "preview-db-id");
  assert.equal(config.kv_namespaces[0].id, "preview-kv-id");
  assert.equal(config.r2_buckets[0].bucket_name, names.bucketName);
});

test("reuses exact existing preview resources", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push([url, init.method ?? "GET"]);
    if (url.endsWith("/workers/subdomain")) return response({ subdomain: "example" });
    if (url.includes("/d1/database?")) {
      return response([{ name: "lymi-app-pr-105-db", uuid: "db-id" }]);
    }
    if (url.includes("/storage/kv/namespaces?")) {
      return response([{ title: "lymi-app-pr-105-sessions", id: "kv-id" }]);
    }
    if (url.includes("/r2/buckets?")) {
      return response({ buckets: [{ name: "lymi-app-pr-105-audio" }] });
    }
    throw new Error(`Unexpected ${url}`);
  };

  const result = await ensurePreviewInfrastructure({
    accountId,
    token,
    prNumber: 105,
    fetchImpl,
  });
  assert.equal(result.previewUrl, "https://preview-lymi-app-pr-105.example.workers.dev");
  assert.equal(calls.filter(([, method]) => method === "POST").length, 0);
});

test("creates preview KV without an account-restricted jurisdiction", async () => {
  let namespaceBody;
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith("/workers/subdomain")) return response({ subdomain: "example" });
    if (url.includes("/d1/database?")) {
      return response([{ name: "lymi-app-pr-105-db", uuid: "db-id" }]);
    }
    if (url.includes("/storage/kv/namespaces?") && !init.method) return response([]);
    if (url.endsWith("/storage/kv/namespaces") && init.method === "POST") {
      namespaceBody = JSON.parse(init.body);
      return response({ title: "lymi-app-pr-105-sessions", id: "kv-id" });
    }
    if (url.includes("/r2/buckets?")) {
      return response({ buckets: [{ name: "lymi-app-pr-105-audio" }] });
    }
    throw new Error(`Unexpected ${url}`);
  };

  await ensurePreviewInfrastructure({ accountId, token, prNumber: 105, fetchImpl });
  assert.deepEqual(namespaceBody, { title: "lymi-app-pr-105-sessions" });
});

test("cleanup deletes only the exact pull request resources", async () => {
  const deleted = [];
  const fetchImpl = async (url, init = {}) => {
    if ((init.method ?? "GET") === "DELETE") {
      deleted.push(url);
      return response(null);
    }
    if (url.includes("/d1/database?")) {
      return response([{ name: "lymi-app-pr-105-db", uuid: "db-id" }]);
    }
    if (url.includes("/storage/kv/namespaces?")) {
      return response([{ title: "lymi-app-pr-105-sessions", id: "kv-id" }]);
    }
    if (url.includes("/r2/buckets?")) {
      return response({ buckets: [{ name: "lymi-app-pr-105-audio" }] });
    }
    throw new Error(`Unexpected ${url}`);
  };

  await cleanupPreviewInfrastructure({ accountId, token, prNumber: 105, fetchImpl });
  assert.deepEqual(deleted, [
    `${apiRoot()}/workers/scripts/lymi-app-pr-105?force=true`,
    `${apiRoot()}/r2/buckets/lymi-app-pr-105-audio`,
    `${apiRoot()}/storage/kv/namespaces/kv-id`,
    `${apiRoot()}/d1/database/db-id`,
  ]);
});

function apiRoot() {
  return "https://api.cloudflare.com/client/v4/accounts/account";
}
