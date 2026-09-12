import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";
import { createDb, type Db, schema } from "../db";
import type { ServiceContext } from "./context";

const appDir = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * A real D1 for service tests: wrangler's local runtime, in memory, with every migration
 * applied. The same database the Worker runs on, so a query that works here works there.
 */
export async function testDb(): Promise<{ db: Db; dispose: () => Promise<void> }> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: `${appDir}wrangler.jsonc`,
    persist: false,
  });
  const migrations = readdirSync(`${appDir}migrations`)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    const statements = readFileSync(`${appDir}migrations/${file}`, "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      // D1 refuses `PRAGMA foreign_keys`; it owns that setting itself.
      .filter((statement) => statement && !/^PRAGMA foreign_keys/i.test(statement));
    for (const statement of statements) await proxy.env.DB.prepare(statement).run();
  }
  return { db: createDb(proxy.env.DB), dispose: () => proxy.dispose() };
}

/** A signed-in learner. Inserts the Better Auth user row the foreign keys need. */
export async function learner(db: Db, id: string, name: string): Promise<ServiceContext> {
  await db.insert(schema.user).values({ id, name, email: `${id}@lymi.test` });
  return { db, userId: id, actor: "user" };
}
