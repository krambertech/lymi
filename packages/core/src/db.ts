/**
 * Server-only entry: the D1 driver and query operators, re-exported so the whole
 * workspace shares one drizzle-orm instance. Import as "@lymi/core/db".
 * (better-auth brings kysely, which would otherwise make pnpm create a second
 * drizzle-orm build for the app and split the types.)
 */
export * from "drizzle-orm";
export { drizzle } from "drizzle-orm/d1";
export type {
  QueryBuilder,
  SQLiteColumn,
  SQLiteInsertBuilder,
  SQLiteInsertOnConflictDoUpdateConfig,
  SQLiteInsertSelectQueryBuilder,
  SQLiteInsertValue,
  SQLiteTable,
  SQLiteUpdateBase,
  SQLiteUpdateBuilder,
  SQLiteUpdateSetSource,
} from "drizzle-orm/sqlite-core";
export { alias, SQLiteAsyncDialect } from "drizzle-orm/sqlite-core";
export { inArray, notInArray } from "./in-list";

export async function selectIn<T, R>(
  values: readonly T[],
  select: (slice: T[]) => Promise<R[]>,
  size = 90,
): Promise<R[]> {
  const rows: R[] = [];
  for (let i = 0; i < values.length; i += size) {
    rows.push(...(await select(values.slice(i, i + size))));
  }
  return rows;
}
