/**
 * Server-only entry: the D1 driver and query operators, re-exported so the whole
 * workspace shares one drizzle-orm instance. Import as "@lymi/core/db".
 * (better-auth brings kysely, which would otherwise make pnpm create a second
 * drizzle-orm build for the app and split the types.)
 */
export * from "drizzle-orm";
export { drizzle } from "drizzle-orm/d1";
export { alias, SQLiteAsyncDialect } from "drizzle-orm/sqlite-core";

/**
 * D1 allows 100 bound parameters per query, so `IN (...)` lists are read in slices of 90. A caller
 * that binds more than the ten spare parameters passes a smaller `size`.
 */
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
