import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateMigrationHistory } from "./check-migrations.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationsDir = resolve(root, "apps/web/migrations");

function apply(db, name) {
  const sql = readFileSync(resolve(migrationsDir, name), "utf8").replaceAll(
    "--> statement-breakpoint",
    "",
  );
  db.exec(sql);
}

test("the production beta schema upgrades without losing earlier signups", () => {
  const db = new DatabaseSync(":memory:");
  for (let index = 0; index <= 5; index += 1) {
    const name = [
      "0000_init.sql",
      "0001_created_by_user_settings.sql",
      "0002_normalized_term.sql",
      "0003_api_keys.sql",
      "0004_oauth_server.sql",
      "0005_awesome_donald_blake.sql",
    ][index];
    apply(db, name);
  }
  db.exec(
    "INSERT INTO beta_signups (email, created_at) VALUES ('earlier@example.com', 1788650000000)",
  );

  apply(db, "0006_clumsy_shotgun.sql");

  const signup = db.prepare("SELECT id, email, source, created_at FROM beta_signups").get();
  assert.match(signup.id, /^[0-9a-f]{20}$/);
  assert.equal(signup.email, "earlier@example.com");
  assert.equal(signup.source, "landing");
  assert.equal(signup.created_at, 1788650000000);
  assert.equal(
    db.prepare("SELECT name FROM sqlite_schema WHERE name = 'push_subscriptions'").get().name,
    "push_subscriptions",
  );
});

test("merged migration checksums cannot be replaced", () => {
  const original = Buffer.from("CREATE TABLE example (id text);");
  const replacement = Buffer.from("DROP TABLE example;");
  const sha256 = createHash("sha256").update(original).digest("hex");
  const replacementSha256 = createHash("sha256").update(replacement).digest("hex");
  const manifest = { migrations: [{ name: "0000_example.sql", sha256 }] };

  assert.throws(
    () =>
      validateMigrationHistory({
        files: new Map([["0000_example.sql", replacement]]),
        manifest: {
          migrations: [{ name: "0000_example.sql", sha256: replacementSha256 }],
        },
        baseline: manifest,
      }),
    /immutable/,
  );
  assert.doesNotThrow(() =>
    validateMigrationHistory({ files: new Map([["0000_example.sql", original]]), manifest }),
  );
});
