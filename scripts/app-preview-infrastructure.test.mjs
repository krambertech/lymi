import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  cleanupPreviewInfrastructure,
  derivePreviewSecrets,
  ensurePreviewInfrastructure,
  makePreviewConfig,
  migratePreviewDatabase,
  migrationFailureReason,
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
    if (url.endsWith("/workers/scripts/lymi-app-pr-105/settings")) return response({});
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
  assert.equal(result.workerExists, true);
  assert.equal(calls.filter(([, method]) => method === "POST").length, 0);
});

test("creates preview KV without an account-restricted jurisdiction", async () => {
  let namespaceBody;
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith("/workers/scripts/lymi-app-pr-105/settings")) {
      return response(null, 404);
    }
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

  const result = await ensurePreviewInfrastructure({ accountId, token, prNumber: 105, fetchImpl });
  assert.deepEqual(namespaceBody, { title: "lymi-app-pr-105-sessions" });
  assert.equal(result.workerExists, false);
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

function previewConfigFile() {
  const path = join(mkdtempSync(join(tmpdir(), "lymi-preview-")), "wrangler.preview.json");
  writeFileSync(
    path,
    JSON.stringify({
      name: "lymi-app-pr-105",
      d1_databases: [
        {
          binding: "DB",
          database_name: "lymi-app-pr-105-db",
          database_id: "old-db-id",
          migrations_dir: "../../migrations",
        },
      ],
    }),
  );
  return path;
}

function boundDatabaseId(path) {
  return JSON.parse(readFileSync(path, "utf8")).d1_databases[0].database_id;
}

function rebuildingD1(calls) {
  return async (url, init = {}) => {
    const method = init.method ?? "GET";
    calls.push([method, url]);
    if (method === "GET" && url.includes("/d1/database?")) {
      return response([{ name: "lymi-app-pr-105-db", uuid: "old-db-id" }]);
    }
    if (method === "DELETE" && url.endsWith("/d1/database/old-db-id")) return response(null);
    if (method === "POST" && url.endsWith("/d1/database")) {
      return response({ name: JSON.parse(init.body).name, uuid: "new-db-id" });
    }
    throw new Error(`Unexpected ${method} ${url}`);
  };
}

test("keeps the preview database when its migrations apply", async () => {
  const configPath = previewConfigFile();
  const calls = [];
  const result = await migratePreviewDatabase({
    accountId,
    token,
    prNumber: 105,
    configPath,
    applyMigrations: () => ({ ok: true }),
    fetchImpl: rebuildingD1(calls),
    log: () => {},
  });

  assert.deepEqual(result, { rebuilt: false, databaseId: "old-db-id" });
  assert.deepEqual(calls, []);
  assert.equal(boundDatabaseId(configPath), "old-db-id");
});

test("rebuilds a preview database whose recorded migrations no longer match", async () => {
  const configPath = previewConfigFile();
  const calls = [];
  const logs = [];
  const appliedTo = [];
  const result = await migratePreviewDatabase({
    accountId,
    token,
    prNumber: 105,
    configPath,
    applyMigrations: () => {
      appliedTo.push(boundDatabaseId(configPath));
      return appliedTo.length === 1
        ? { ok: false, reason: "table card_images already exists at offset 13: SQLITE_ERROR" }
        : { ok: true };
    },
    fetchImpl: rebuildingD1(calls),
    log: (line) => logs.push(line),
  });

  assert.deepEqual(result, { rebuilt: true, databaseId: "new-db-id" });
  assert.deepEqual(appliedTo, ["old-db-id", "new-db-id"]);
  assert.deepEqual(
    calls.map(([method, url]) => [method, url.replace(apiRoot(), "")]),
    [
      ["GET", "/d1/database?name=lymi-app-pr-105-db&per_page=100"],
      ["DELETE", "/d1/database/old-db-id"],
      ["POST", "/d1/database"],
    ],
  );
  assert.match(logs[0], /^::warning title=Preview database rebuilt::/);
  assert.match(logs[0], /table card_images already exists/);
});

test("fails when a migration is broken on an empty preview database", async () => {
  const configPath = previewConfigFile();
  const logs = [];
  let attempts = 0;
  await assert.rejects(
    migratePreviewDatabase({
      accountId,
      token,
      prNumber: 105,
      configPath,
      applyMigrations: () => {
        attempts += 1;
        return { ok: false, reason: 'near "CREAT": syntax error' };
      },
      fetchImpl: rebuildingD1([]),
      log: (line) => logs.push(line),
    }),
    /Migrations fail on an empty preview database \(near "CREAT": syntax error\)/,
  );
  assert.equal(attempts, 2);
  assert.equal(logs.length, 1);
});

test("refuses a config bound to another pull request's database", async () => {
  const configPath = previewConfigFile();
  await assert.rejects(
    migratePreviewDatabase({
      accountId,
      token,
      prNumber: 106,
      configPath,
      applyMigrations: () => assert.fail("migrations must not run"),
      fetchImpl: rebuildingD1([]),
    }),
    /not bound to lymi-app-pr-106-db/,
  );
});

test("names the Wrangler error that stopped the migrations", () => {
  const output =
    "🌀 Executing on remote database DB\n\u001b[31m✘ \u001b[41;31m[\u001b[41;97mERROR\u001b[41;31m]\u001b[0m \u001b[1mtable card_images already exists at offset 13: SQLITE_ERROR\u001b[0m\n";
  assert.equal(
    migrationFailureReason({ status: 1, output }),
    "table card_images already exists at offset 13: SQLITE_ERROR",
  );
  const remote =
    "[31m✘ [41;31m[[41;97mERROR[41;31m][0m [1mA request to the Cloudflare API (/accounts/a/d1/database/db/query) failed.[0m\n  table `card_images` already exists at offset 13: SQLITE_ERROR [code: 7500]\n\n🪵  Logs were written to /tmp/wrangler.log\n";
  assert.equal(
    migrationFailureReason({ status: 1, output: remote }),
    "A request to the Cloudflare API (/accounts/a/d1/database/db/query) failed. table `card_images` already exists at offset 13: SQLITE_ERROR [code: 7500]",
  );
  assert.equal(migrationFailureReason({ status: 7, output: "" }), "Wrangler exited with code 7");
});

function apiRoot() {
  return "https://api.cloudflare.com/client/v4/accounts/account";
}
