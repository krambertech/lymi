import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getPlatformProxy } from "wrangler";
import { createDb, type Db, schema } from "../db";
import type { ServiceContext } from "./context";

/** The local bindings service tests use: Images runs offline, R2 is in memory. */
export type TestBindings = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  PRIVATE_IMAGES: R2Bucket;
  IMAGES: ImagesBinding;
  IMPORTS: R2Bucket;
  EXPORTS: R2Bucket;
  AUDIO: R2Bucket;
};

const appDir = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * A real D1 for service tests: wrangler's local runtime, in memory, with every migration
 * applied. The same database the Worker runs on, so a query that works here works there.
 * `before` stops short of one migration so a test can seed data and apply the rest itself.
 */
export async function testDb(opts: { before?: string } = {}): Promise<{
  db: Db;
  env: TestBindings;
  raw: D1Database;
  migrate: (file: string) => Promise<void>;
  /** Applies every migration from `first` on, in order. */
  migrateFrom: (first: string) => Promise<void>;
  dispose: () => Promise<void>;
}> {
  const proxy = await getPlatformProxy<TestBindings>({
    configPath: `${appDir}wrangler.jsonc`,
    // No `.env` files. Wrangler still reads `.dev.vars` on its own; nothing here uses it.
    envFiles: [],
    persist: false,
  });
  const migrate = async (file: string) => {
    const statements = readFileSync(`${appDir}migrations/${file}`, "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      // D1 refuses `PRAGMA foreign_keys`; it owns that setting itself.
      .filter((statement) => statement && !/^PRAGMA foreign_keys/i.test(statement));
    for (const statement of statements) await proxy.env.DB.prepare(statement).run();
  };
  const migrations = readdirSync(`${appDir}migrations`)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    if (opts.before && file >= opts.before) break;
    await migrate(file);
  }
  return {
    db: createDb(proxy.env.DB),
    env: proxy.env,
    raw: proxy.env.DB,
    migrate,
    migrateFrom: async (first) => {
      for (const file of migrations.filter((name) => name >= first)) await migrate(file);
    },
    dispose: () => proxy.dispose(),
  };
}

/** A signed-in learner. Inserts the Better Auth user row the foreign keys need. */
export async function learner(db: Db, id: string, name: string): Promise<ServiceContext> {
  await db.insert(schema.user).values({ id, name, email: `${id}@lymi.test` });
  return { db, userId: id, actor: "user" };
}
