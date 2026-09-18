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

/** A local D1 with every migration applied, plus the rest of the Worker's bindings. */
export type TestDb = {
  db: Db;
  env: TestBindings;
  raw: D1Database;
  dispose: () => Promise<void>;
};

/** A database stopped short of a migration, which the test applies itself. */
export type MigratingTestDb = TestDb & {
  migrate: (file: string) => Promise<void>;
  /** Applies every migration from `first` on, in order. */
  migrateFrom: (first: string) => Promise<void>;
};

const appDir = fileURLToPath(new URL("../../../", import.meta.url));

const migrations = readdirSync(`${appDir}migrations`)
  .filter((file) => file.endsWith(".sql"))
  .sort();

function statementsIn(file: string): string[] {
  return (
    readFileSync(`${appDir}migrations/${file}`, "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      // D1 refuses `PRAGMA foreign_keys`; it owns that setting itself.
      .filter((statement) => statement && !/^PRAGMA foreign_keys/i.test(statement))
  );
}

/** Wrangler's local runtime, in memory, migrated up to but not including `before`. */
async function boot(before?: string): Promise<MigratingTestDb> {
  const proxy = await getPlatformProxy<TestBindings>({
    configPath: `${appDir}wrangler.jsonc`,
    // No `.env` files. Wrangler still reads `.dev.vars` on its own; nothing here uses it.
    envFiles: [],
    persist: false,
  });
  const migrate = async (file: string) => {
    for (const statement of statementsIn(file)) await proxy.env.DB.prepare(statement).run();
  };
  for (const file of migrations) {
    if (before && file >= before) break;
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

/**
 * The one runtime the unit project's service tests share. Booting workerd and replaying every
 * migration costs a second or more, and it grew with each migration; emptying the bindings costs
 * milliseconds and does not. It lives on `globalThis` because the setup file empties the module
 * registry before every file, so module scope would not outlive one.
 */
const cache = Symbol.for("lymi.test-db");
type Cached = { [cache]?: Promise<{ runtime: MigratingTestDb; empty: string }> };

/** Every table a delete has to reach, ordered so each one empties before the tables it points at. */
async function emptyStatements(raw: D1Database): Promise<string> {
  const tables = await raw
    .prepare(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%'",
    )
    .all<{ name: string }>();
  const names = tables.results.map(({ name }) => name);
  const references = await raw.batch<{ table: string }>(
    names.map((name) => raw.prepare(`pragma foreign_key_list("${name}")`)),
  );
  const dependents = new Map(names.map((name) => [name, new Set<string>()]));
  names.forEach((name, index) => {
    for (const row of references[index]?.results ?? []) {
      if (row.table !== name) dependents.get(row.table)?.add(name);
    }
  });
  const order: string[] = [];
  const emptied = new Set<string>();
  // A table empties once nothing still points at it. A cycle stalls the pass, so it takes the rest.
  while (emptied.size < names.length) {
    const ready = names.filter(
      (name) =>
        !emptied.has(name) &&
        [...(dependents.get(name) ?? [])].every((child) => emptied.has(child)),
    );
    for (const name of ready.length > 0 ? ready : names.filter((name) => !emptied.has(name))) {
      order.push(name);
      emptied.add(name);
    }
  }
  return order.map((name) => `delete from "${name}";`).join("\n");
}

function sharedRuntime() {
  const held = globalThis as Cached;
  held[cache] ??= (async () => {
    const runtime = await boot();
    return { runtime, empty: await emptyStatements(runtime.raw) };
  })();
  return held[cache];
}

async function emptyBucket(bucket: R2Bucket) {
  const { objects } = await bucket.list();
  if (objects.length > 0) await bucket.delete(objects.map((object) => object.key));
}

/**
 * A real D1 for service tests: the same database the Worker runs on, so a query that works here
 * works there. Every call hands back the shared runtime with nothing in it, which is the only
 * isolation these tests get — a test owns the rows it writes and must not read another's.
 * `dispose` is there for symmetry; the runtime outlives the file.
 */
export async function testDb(): Promise<TestDb>;
/** Stops short of one migration so a test can seed data and apply the rest itself. */
export async function testDb(opts: { before: string }): Promise<MigratingTestDb>;
export async function testDb(opts: { before?: string } = {}): Promise<TestDb> {
  if (opts.before) return boot(opts.before);
  const { runtime, empty } = await sharedRuntime();
  const { SESSIONS, PRIVATE_IMAGES, IMPORTS, EXPORTS, AUDIO } = runtime.env;
  await runtime.raw.exec(empty);
  const sessions = await SESSIONS.list();
  await Promise.all([
    ...sessions.keys.map((key) => SESSIONS.delete(key.name)),
    emptyBucket(PRIVATE_IMAGES),
    emptyBucket(IMPORTS),
    emptyBucket(EXPORTS),
    emptyBucket(AUDIO),
  ]);
  return { db: runtime.db, env: runtime.env, raw: runtime.raw, dispose: async () => {} };
}

/** A signed-in learner. Inserts the Better Auth user row the foreign keys need. */
export async function learner(db: Db, id: string, name: string): Promise<ServiceContext> {
  await db.insert(schema.user).values({ id, name, email: `${id}@lymi.test` });
  return { db, userId: id, actor: "user" };
}
